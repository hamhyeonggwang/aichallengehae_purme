'use client';

import { useMemo, useState } from 'react';
import {
  OUTPATIENT_DAY, SAMPLE_MESSAGES, SCALE, DEFAULT_WAITLIST,
  therapyByCode, therapistById, WaitEntry, TherapyCode,
} from '@/lib/mockData';
import { matchAll, SlotMatch } from '@/lib/matcher';
import { parseWaitlistCsv, buildSampleCsv, CSV_HEADER } from '@/lib/csv';
import { anonymize, reidentify, AnonymizeResult } from '@/lib/anonymize';
import { Trace } from '@/lib/pipeline';
import PipelineTrace from '@/components/PipelineTrace';
import type { ExtractResult } from '@/lib/fallbackParser';

export default function Page() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [anon, setAnon] = useState<AnonymizeResult | null>(null);
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [waitlist, setWaitlist] = useState<WaitEntry[]>(DEFAULT_WAITLIST);
  const [csvNote, setCsvNote] = useState<string | null>(null);
  const [picked, setPicked] = useState<Record<string, string>>({});

  /** 결석으로 비는 회기 — 규칙 구간 */
  const openSlots = useMemo(() => {
    if (!result) return [];
    const { scope, cancelledTherapies } = result.fields;
    if (scope === 'all') return OUTPATIENT_DAY.sessions;
    if (scope === 'partial' && cancelledTherapies?.length) {
      const set = new Set(cancelledTherapies as TherapyCode[]);
      return OUTPATIENT_DAY.sessions.filter((s) => set.has(s.therapy));
    }
    return [];
  }, [result]);

  const matches: SlotMatch[] = useMemo(
    () => (openSlots.length ? matchAll(openSlots, waitlist) : []),
    [openSlots, waitlist],
  );

  const notice = buildNotice(matches, picked);

  /** 실행 경로 추적 — n8n 노드와 1:1 대응 */
  const trace: Trace = useMemo(() => {
    const t: Trace = {};
    if (!anon) return t;

    t.intake = {
      key: 'intake', status: 'done',
      summary: `${anon.original.length}자 수신`,
      detail: anon.original,
    };
    t.anonymize = {
      key: 'anonymize', status: 'done',
      summary: anon.count > 0
        ? `식별정보 ${anon.count}건을 토큰으로 치환`
        : '치환 대상 식별정보 없음',
      detail: `${anon.anonymized}\n\n--- 매핑 (브라우저 메모리에만 존재) ---\n${
        Object.entries(anon.mapping).map(([k, v]) => `${k}  ←  ${v}`).join('\n') || '(없음)'
      }`,
    };

    if (result) {
      t.extract = {
        key: 'extract',
        status: result.source === 'fallback' ? 'fallback' : 'done',
        summary: result.source === 'fallback'
          ? '규칙 파서로 처리 — 모델 미사용'
          : '모델이 항목을 추출',
        detail: JSON.stringify(result.fields, null, 2),
      };
      t.waitlist = {
        key: 'waitlist', status: 'done',
        summary: `대기 명단 ${waitlist.length}행 로드`,
        detail: waitlist.slice(0, 5)
          .map((w) => `${w.childId} ${w.therapy} 잔여 ${w.remaining} 대기 ${w.waitingDays}일`)
          .join('\n') + (waitlist.length > 5 ? `\n… 외 ${waitlist.length - 5}행` : ''),
      };
      t.match = {
        key: 'match',
        status: matches.length ? 'done' : 'skipped',
        summary: matches.length
          ? `${matches.length}개 회기에 대해 후보 산출`
          : '결석 범위 미확정으로 계산 불가',
        detail: matches.length
          ? matches.map((m) =>
              `${m.time} ${therapyByCode(m.therapy).name} → 후보 ${m.candidates.length}건 / 제외 ${m.excluded.length}건`,
            ).join('\n')
          : undefined,
      };
    }

    const pickedCount = Object.keys(picked).length;
    t.reidentify = {
      key: 'reidentify',
      status: pickedCount ? 'done' : 'idle',
      summary: pickedCount
        ? `${pickedCount}건의 토큰을 표시명으로 복원`
        : '후보 선택 후 실행',
    };
    t.approve = {
      key: 'approve',
      status: notice ? 'idle' : 'idle',
      summary: notice ? '안내문 생성 완료 · 사람 승인 대기' : '승인 대기',
    };
    return t;
  }, [anon, result, waitlist, matches, picked, notice]);

  async function runExtract(value?: string) {
    const payload = (value ?? text).trim();
    if (!payload) return;
    setLoading(true);
    setError(null);
    setPicked({});

    // 1) 익명화 — 서버로 보내기 전에 브라우저에서 먼저 처리
    const a = anonymize(payload);
    setAnon(a);

    try {
      // 2) 익명 텍스트만 서버로 전달
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: a.anonymized }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data as ExtractResult);
    } catch {
      setError('추출에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function onCsv(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { entries, skipped } = parseWaitlistCsv(String(reader.result));
      if (entries.length === 0) {
        setCsvNote('읽을 수 있는 행이 없습니다. 헤더 형식을 확인해 주세요.');
        return;
      }
      setWaitlist(entries);
      setCsvNote(
        `${entries.length}행을 불러왔습니다.` +
          (skipped.length ? ` ${skipped.length}행은 건너뛰었습니다 (${skipped[0].reason}).` : ''),
      );
    };
    reader.readAsText(file, 'utf-8');
  }

  function downloadSample() {
    // 엑셀(Windows 기본값)에서 한글이 깨지지 않도록 UTF-8 BOM을 붙인다
    const blob = new Blob(['﻿' + buildSampleCsv(DEFAULT_WAITLIST)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'waitlist-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <SafetyBanner />
      <Header />

      <Section step="1" title="결석 내용을 붙여넣습니다" zone="ai">
        <div className="grid gap-4 md:grid-cols-[1fr_260px]">
          <div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder="보호자 문자, 코디네이터 메모, 치료사 전달 내용 어느 것이든 그대로 붙여넣으세요."
              className="w-full resize-none rounded-xl2 border border-line bg-card p-4 text-[15px] leading-relaxed placeholder:text-muted"
            />
            <button
              onClick={() => runExtract()}
              disabled={loading || !text.trim()}
              className="mt-3 rounded-xl2 bg-teal px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? '처리 중…' : '읽어서 정리하기'}
            </button>
            {error && <p className="mt-2 text-sm text-amber">{error}</p>}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted">예시로 시험해 보기</p>
            {SAMPLE_MESSAGES.map((s) => (
              <button
                key={s.level}
                onClick={() => { setText(s.text); runExtract(s.text); }}
                className="w-full rounded-xl2 border border-line bg-card p-3 text-left transition hover:border-teal"
              >
                <span className="text-[13px] font-semibold">{s.level}</span>
                <span className="mt-0.5 block text-[11px] leading-snug text-muted">{s.note}</span>
              </button>
            ))}
          </div>
        </div>
      </Section>

      {anon && <PipelineTrace trace={trace} />}

      {result && (
        <Section step="2" title="추출된 항목" zone="ai"
          aside={result.source === 'fallback' ? '규칙 파서로 처리됨' : 'AI 추출'}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 서버는 토큰(C-XX)만 돌려준다. 표시명 복원은 브라우저의 매핑으로만 수행한다 */}
            <Field label="대상"
              value={result.fields.subjectToken && anon
                ? reidentify(result.fields.subjectToken, anon.mapping)
                : null}
              conf={result.confidence.subjectToken} />
            <Field label="날짜" value={result.fields.date} conf={result.confidence.date} />
            <Field label="결석 범위"
              value={result.fields.scope === 'all' ? '전체' : result.fields.scope === 'partial' ? '일부' : null}
              conf={result.confidence.scope} />
            <Field label="사유" value={result.fields.reason} conf={result.confidence.reason} />
          </div>
          {result.fields.scope === 'partial' && (
            <p className="mt-3 text-sm text-muted">
              결석 종목:{' '}
              <span className="font-semibold text-ink">
                {(result.fields.cancelledTherapies ?? []).map((c) => therapyByCode(c as TherapyCode).name).join(' · ')}
              </span>
            </p>
          )}
          {result.note && <p className="mt-3 text-sm text-amber">{result.note}</p>}
        </Section>
      )}

      {result && (
        <Section step="3" title="보강 후보" zone="rule" aside={`대기 명단 ${waitlist.length}행`}>
          <CsvBar note={csvNote} onFile={onCsv} onSample={downloadSample} />
          {matches.length === 0 ? (
            <p className="mt-4 rounded-xl2 border border-line bg-card p-5 text-sm text-muted">
              결석 범위가 확정되지 않아 빈 회기를 계산할 수 없습니다. 2단계에서 범위를 확인해 주세요.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted">
                이 결석으로 <b className="text-ink">{matches.length}건</b>의 회기가 비었습니다.
              </p>
              {matches.map((m) => (
                <SlotCard key={`${m.time}-${m.therapy}`} match={m}
                  picked={picked[m.time]}
                  onPick={(id) => setPicked((p) => ({ ...p, [m.time]: id }))} />
              ))}
            </div>
          )}
        </Section>
      )}

      {notice && (
        <Section step="4" title="담당자에게 보낼 안내" zone="ai">
          <pre className="whitespace-pre-wrap rounded-xl2 border border-line bg-card p-4 text-[14px] leading-relaxed">
            {notice}
          </pre>
          <button
            onClick={() => navigator.clipboard?.writeText(notice)}
            className="mt-3 rounded-xl2 border border-teal px-4 py-2 text-sm font-semibold text-teal"
          >
            복사하기
          </button>
        </Section>
      )}

      <RoleSplit />
      <footer className="mt-10 border-t border-line pt-5 text-xs leading-relaxed text-muted">
        보강 브릿지 · AI 챌린지 해 예선 제출용 시연 프로토타입<br />
        표시된 아동·치료사·일정은 전부 가상 데이터이며 실제 진료 정보가 아닙니다.
      </footer>
    </main>
  );
}

/* ────────────────────────────────────────── */

function SafetyBanner() {
  return (
    <div className="mb-5 rounded-xl2 border border-amber/40 bg-amber/10 px-4 py-2.5 text-[13px] font-medium text-ink">
      가상 데이터로 동작합니다 · 실제 환자 정보는 포함되어 있지 않습니다
    </div>
  );
}

function Header() {
  const stats = [
    { v: SCALE.therapists, l: '치료사' },
    { v: SCALE.therapies, l: '치료 종목' },
    { v: SCALE.childrenManaged, l: '관리 아동' },
    { v: SCALE.coordinators, l: '코디네이터' },
  ];
  return (
    <header className="mb-8">
      <p className="text-[13px] font-semibold tracking-wide text-teal">치료 재배정 보조 시스템</p>
      <h1 className="mt-1.5 text-[30px] font-bold leading-tight sm:text-[36px]">혹시 지금 자리 있나요</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
        보호자가 가장 많이 하는 질문입니다. 치료가 취소되면 그 시간은 비고, 같은 시간에
        그 치료를 기다리는 아동이 있습니다. 현장에서는 이 연결을 &apos;보강&apos;이라 부릅니다.
        후보를 찾는 일은 자동으로, 배정은 담당자가 결정합니다.
      </p>
      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl2 border border-line bg-line sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.l} className="bg-card px-4 py-3">
            <dt className="text-[11px] text-muted">{s.l}</dt>
            <dd className="text-[20px] font-bold">{s.v}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}

function Section({ step, title, zone, aside, children }: {
  step: string; title: string; zone: 'ai' | 'rule';
  aside?: string; children: React.ReactNode;
}) {
  return (
    <section className={`mb-6 rounded-xl3 border border-line p-5 ${zone === 'rule' ? 'zone-rule bg-card/60' : 'bg-card'}`}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[12px] font-bold text-ivory">{step}</span>
        <h2 className="text-[17px] font-bold">{title}</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
          zone === 'ai' ? 'bg-teal/15 text-teal' : 'bg-ink/10 text-ink'}`}>
          {zone === 'ai' ? 'AI가 읽는 구간' : '규칙이 정하는 구간'}
        </span>
        {aside && <span className="ml-auto text-[12px] text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, conf }: { label: string; value: string | null; conf?: number }) {
  const low = value !== null && conf !== undefined && conf < 0.7;
  const empty = value === null;
  return (
    <div className={`rounded-xl2 border p-3 ${
      empty ? 'border-dashed border-line' : low ? 'border-amber bg-amber/5' : 'border-line bg-ivory/50'}`}>
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-0.5 text-[15px] font-semibold ${empty ? 'text-muted' : ''}`}>{value ?? '확인 필요'}</p>
      {low && <p className="mt-1 text-[11px] font-medium text-amber">확신이 낮습니다</p>}
    </div>
  );
}

function CsvBar({ note, onFile, onSample }: {
  note: string | null; onFile: (f: File) => void; onSample: () => void;
}) {
  return (
    <div className="rounded-xl2 border border-line bg-ivory/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="cursor-pointer rounded-lg border border-teal px-3 py-1.5 text-[13px] font-semibold text-teal">
          대기 명단 CSV 올리기
          <input type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        </label>
        <button onClick={onSample} className="text-[13px] font-medium text-muted underline underline-offset-2">
          샘플 CSV 내려받기
        </button>
      </div>
      <p className="mt-2 font-mono text-[11px] leading-snug text-muted">{CSV_HEADER}</p>
      {note && <p className="mt-1.5 text-[12px] font-medium text-teal">{note}</p>}
    </div>
  );
}

function SlotCard({ match, picked, onPick }: {
  match: SlotMatch; picked?: string; onPick: (id: string) => void;
}) {
  const therapy = therapyByCode(match.therapy);
  const therapist = therapistById(match.therapistId);
  return (
    <article className="rounded-xl2 border border-line bg-card p-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[17px] font-bold">{match.time}</span>
        <span className="text-[15px] font-semibold text-teal">{therapy.name}</span>
        <span className="text-[13px] text-muted">{therapist?.label} · {therapy.room}</span>
        <span className="ml-auto text-[11px] text-muted">
          이 종목 수행 가능 치료사 {match.eligibleTherapists}명
        </span>
      </div>

      {match.candidates.length === 0 ? (
        <p className="mt-3 text-[13px] text-muted">조건에 맞는 대기 아동이 없습니다.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {match.candidates.map((c, i) => {
            const id = `${c.entry.childId}-${c.entry.therapy}`;
            const on = picked === id;
            return (
              <li key={id}>
                <button onClick={() => onPick(id)}
                  className={`w-full rounded-xl2 border p-3 text-left transition ${
                    on ? 'border-teal bg-teal/8' : 'border-line hover:border-teal/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-bold text-muted">{i + 1}순위</span>
                    <span className="text-[15px] font-semibold">{c.entry.alias}</span>
                    {on && <span className="ml-auto text-[12px] font-bold text-teal">선택됨</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {c.reasons.map((r) => (
                      <span key={r.label} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        r.tone === 'limit' ? 'bg-ink/8 text-muted' : 'bg-teal/12 text-teal'}`}>
                        {r.label}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1.5 text-[12px] text-muted">{c.rankNote}</p>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {match.excluded.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-muted">
            제외된 대기 아동 {match.excluded.length}명 보기
          </summary>
          <ul className="mt-2 space-y-1">
            {match.excluded.map((e) => (
              <li key={`${e.entry.childId}-${e.entry.therapy}`} className="text-[12px] text-muted">
                {e.entry.alias} — {e.cause}
              </li>
            ))}
          </ul>
        </details>
      )}
    </article>
  );
}

function RoleSplit() {
  const rows = [
    ['결석 내용 읽기', 'AI'],
    ['결석 종목 판별', 'AI'],
    ['식별정보 치환', '규칙'],
    ['빈 회기 계산', '규칙'],
    ['대기자 조건 대조', '규칙'],
    ['후보 순위 결정', '규칙'],
    ['최종 배정 확정', '사람'],
  ] as const;
  const tone: Record<string, string> = {
    AI: 'bg-teal/15 text-teal',
    규칙: 'bg-ink/10 text-ink',
    사람: 'bg-amber/20 text-ink',
  };
  return (
    <section className="mt-8 rounded-xl3 border border-line bg-card p-5">
      <h2 className="text-[15px] font-bold">누가 무엇을 하는가</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        담당자의 판단을 대신하지 않습니다. 흩어진 정보를 모아 후보와 근거를 정리하는
        데까지가 도구의 역할이고, 누구에게 배정할지는 담당자가 결정합니다.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {rows.map(([task, who]) => (
          <li key={task} className="flex items-center gap-2 rounded-xl2 border border-line px-3 py-2">
            <span className="text-[13px]">{task}</span>
            <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold ${tone[who]}`}>{who}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function buildNotice(matches: SlotMatch[], picked: Record<string, string>): string | null {
  const lines: string[] = [];
  for (const m of matches) {
    const id = picked[m.time];
    if (!id) continue;
    const c = m.candidates.find((x) => `${x.entry.childId}-${x.entry.therapy}` === id);
    if (!c) continue;
    const therapy = therapyByCode(m.therapy);
    const therapist = therapistById(m.therapistId);
    lines.push(`· ${m.time} ${therapy.name} (${therapist?.label}) → ${c.entry.alias} / 잔여 ${c.entry.remaining}회`);
  }
  if (lines.length === 0) return null;
  return [
    '[보강 제안]',
    '결석으로 아래 회기가 비었습니다. 배정 가능하신지 회신 부탁드립니다.',
    '',
    ...lines,
    '',
    '※ 확정 아님 · 코디네이터 승인 후 배정됩니다.',
  ].join('\n');
}

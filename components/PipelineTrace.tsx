'use client';

import { useState } from 'react';
import { STAGES, Trace, OWNER_TONE, StageStatus } from '@/lib/pipeline';

const STATUS_LABEL: Record<StageStatus, string> = {
  idle: '대기',
  done: '완료',
  skipped: '건너뜀',
  fallback: '폴백',
};

const STATUS_TONE: Record<StageStatus, string> = {
  idle: 'text-muted',
  done: 'text-teal',
  skipped: 'text-muted',
  fallback: 'text-amber',
};

export default function PipelineTrace({ trace }: { trace: Trace }) {
  const [open, setOpen] = useState<string | null>(null);
  const doneCount = Object.values(trace).filter((t) => t.status === 'done').length;

  return (
    <section className="mb-6 rounded-xl3 border border-line bg-card p-5">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <h2 className="text-[17px] font-bold">실행 경로</h2>
        <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[11px] font-semibold">
          {doneCount} / {STAGES.length} 단계
        </span>
      </div>
      <p className="mb-4 text-[13px] leading-relaxed text-muted">
        아래 단계는 <code className="font-mono text-[12px]">n8n/workflow.json</code>의 노드 구성과
        1:1로 대응합니다. 기관 내부망에서도 같은 순서로 실행됩니다.
      </p>

      <ol className="space-y-1.5">
        {STAGES.map((s, i) => {
          const t = trace[s.key];
          const status: StageStatus = t?.status ?? 'idle';
          const isOpen = open === s.key;
          const hasDetail = Boolean(t?.detail);

          return (
            <li key={s.key}>
              <button
                onClick={() => hasDetail && setOpen(isOpen ? null : s.key)}
                disabled={!hasDetail}
                className={`w-full rounded-xl2 border p-3 text-left transition ${
                  status === 'done'
                    ? 'border-teal/40 bg-teal/5'
                    : status === 'fallback'
                      ? 'border-amber/50 bg-amber/5'
                      : 'border-line'
                } ${hasDetail ? 'hover:border-teal' : 'cursor-default'}`}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink/8 text-[11px] font-bold">
                    {i + 1}
                  </span>
                  <span className="text-[14px] font-semibold">{s.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${OWNER_TONE[s.owner]}`}>
                    {s.owner}
                  </span>
                  {s.runtime !== '—' && (
                    <span className="rounded border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted">
                      {s.runtime}
                    </span>
                  )}
                  <span className={`ml-auto text-[11px] font-semibold ${STATUS_TONE[status]}`}>
                    {STATUS_LABEL[status]}
                  </span>
                </div>

                <p className="mt-1 pl-7 text-[12px] text-muted">
                  {t?.summary ?? s.note}
                </p>

                {hasDetail && (
                  <p className="mt-1 pl-7 text-[11px] font-medium text-teal">
                    {isOpen ? '접기' : '데이터 보기'}
                  </p>
                )}
              </button>

              {isOpen && t?.detail && (
                <pre className="mt-1 overflow-x-auto rounded-xl2 border border-line bg-ivory/60 p-3 font-mono text-[11px] leading-relaxed">
                  {t.detail}
                </pre>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 border-t border-line pt-3 text-[12px] leading-relaxed text-muted">
        <b className="text-ink">실명이 존재하는 구간은 1단계와 6단계뿐입니다.</b> 그 사이의
        추출과 매칭은 토큰만 다룹니다. 이 구조에서는 어떤 모델을 쓰든 식별정보가 노출되지 않습니다.
      </p>
    </section>
  );
}

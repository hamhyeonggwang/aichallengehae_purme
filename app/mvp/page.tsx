import Link from 'next/link';
import SafetyBanner from '@/components/SafetyBanner';
import SiteNav from '@/components/SiteNav';

const FLOW = [
  '결석 문자 1건 입력',
  '무엇이 취소됐는지 추출',
  '비는 회기 확정',
  '회기별 보강 후보 제시',
  '안내문 초안 생성',
];

const FEATURES = [
  {
    id: 'F1',
    title: '결석 문자 입력',
    zone: 'ai' as const,
    points: ['textarea + 예시 3종 버튼', '난이도 상승 순 구성(기본 → 생략 → 부분 결석)'],
  },
  {
    id: 'F2',
    title: '구조화 추출',
    zone: 'ai' as const,
    points: ['신뢰도 0.7 미만 → "확신이 낮습니다" 표시', '추출 실패 필드는 빈칸 유지(추측값 금지)'],
  },
  {
    id: 'F3',
    title: '대기 명단 CSV 업로드',
    zone: 'rule' as const,
    points: ['업로드 시 내장 상수를 교체', '브라우저 메모리에서만 처리, 서버 미전송'],
  },
  {
    id: 'F4',
    title: '보강 후보 매칭',
    zone: 'rule' as const,
    points: ['AI 미호출. 동일 입력 → 항상 동일 순서', '근거 배지 + 제외 사유 노출'],
  },
  {
    id: 'F5',
    title: '안내문 생성',
    zone: 'ai' as const,
    points: ['후보 선택 → 치료사용 안내문 초안 + 복사', '"확정 아님 · 회신 후 배정" 문구 필수'],
  },
  {
    id: 'F6',
    title: '안전 표시',
    zone: 'rule' as const,
    points: ['가상 데이터 상시 고지 배너', 'AI/규칙/사람 역할 분담표'],
  },
];

const OUT = [
  ['로그인 · 사용자 계정', '심사위원 즉시 접속이 필수 요건'],
  ['데이터베이스', '상태 저장 불필요. 개발 시간만 소모'],
  ['자동 발송(문자·알림톡)', '사전승인 리드타임 불확실'],
  ['병원 시스템 연동', '정보보안 심사 기간 확보 불가'],
  ['다건 동시 처리', '하루 1건 처리로 흐름 증명 충분'],
  ['언어치료', '이번 범위 제외'],
  ['슬롯 간 후보 충돌 해소', '슬롯 단위 그리디로 충분. 전역 최적은 본선'],
  ['실제 Ollama 연동', '공개 웹에서 시연 불가. n8n 파일로 대체'],
  ['다크모드 · 애니메이션 · 통계 화면', '심사 요건과 무관'],
];

const ACCEPTANCE = [
  ['심사위원이 로그인 없이 접속', '가능'],
  ['예시 버튼 1회로 전체 흐름 완주', '가능'],
  ['API 장애 시에도 화면 동작', '폴백 전환'],
  ['실데이터 노출', '0건'],
];

export default function MvpPage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <SafetyBanner />
      <SiteNav />

      <header className="mb-8">
        <p className="text-[13px] font-semibold tracking-wide text-teal">2. MVP</p>
        <h1 className="mt-1.5 text-[30px] font-bold leading-tight sm:text-[36px]">만드는 것과 만들지 않는 것</h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
          흐름 하나를 끝까지 작동시키는 것이 목표입니다. 흐름을 넓히지 않고 깊게 만듭니다.
        </p>
      </header>

      <section className="mb-8">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-teal">만드는 것 — 단 하나의 흐름</h2>
        <ol className="flex flex-wrap items-center gap-2">
          {FLOW.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-xl2 border border-line bg-card px-3 py-2 text-[13px] font-semibold text-ink">
                {i + 1}. {step}
              </span>
              {i < FLOW.length - 1 && <span className="text-muted">→</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-teal">기능 명세 (P0)</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.id} className="rounded-xl2 border border-line bg-card p-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-bold text-ivory">{f.id}</span>
                <h3 className="text-[14px] font-bold">{f.title}</h3>
                <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  f.zone === 'ai' ? 'bg-teal/15 text-teal' : 'bg-ink/10 text-ink'}`}>
                  {f.zone === 'ai' ? 'AI' : '규칙'}
                </span>
              </div>
              <ul className="space-y-1">
                {f.points.map((p) => (
                  <li key={p} className="text-[12px] leading-relaxed text-muted">· {p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-amber">만들지 않는 것 (Out)</h2>
        <div className="overflow-hidden rounded-xl2 border border-line">
          <table className="w-full border-collapse text-[13px]">
            <tbody>
              {OUT.map(([item, reason], i) => (
                <tr key={item} className={i % 2 === 0 ? 'bg-card' : 'bg-ivory/50'}>
                  <td className="border-b border-line px-4 py-2.5 font-semibold text-ink">{item}</td>
                  <td className="border-b border-line px-4 py-2.5 text-muted">{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[12px] text-muted">
          위 목록에 있는 기능은 &quot;있으면 좋을 것 같아서&quot; 추가하지 않습니다. 범위 초과는 이 프로젝트에서
          가장 큰 실패 요인입니다.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-teal">프로토타입 판정 기준</h2>
        <dl className="grid gap-px overflow-hidden rounded-xl2 border border-line bg-line sm:grid-cols-4">
          {ACCEPTANCE.map(([k, v]) => (
            <div key={k} className="bg-card px-4 py-3">
              <dt className="text-[11px] text-muted">{k}</dt>
              <dd className="mt-0.5 text-[15px] font-bold text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <Link href="/prd"
          className="group rounded-xl3 border border-line bg-card p-5 transition hover:border-teal">
          <span className="text-[11px] font-semibold text-muted">1. PRD</span>
          <h3 className="mt-1 text-[17px] font-bold group-hover:text-teal">문제·해결·차별점 다시 보기</h3>
        </Link>
        <Link href="/app"
          className="group rounded-xl3 border border-line bg-card p-5 transition hover:border-teal">
          <span className="text-[11px] font-semibold text-muted">3. 데모</span>
          <h3 className="mt-1 text-[17px] font-bold group-hover:text-teal">데모 체험하기</h3>
        </Link>
      </section>

      <footer className="border-t border-line pt-5 text-xs leading-relaxed text-muted">
        보강 브릿지 · AI 챌린지 해 예선 제출용 시연 프로토타입<br />
        표시된 아동·치료사·일정은 전부 가상 데이터이며 실제 진료 정보가 아닙니다.
      </footer>
    </main>
  );
}

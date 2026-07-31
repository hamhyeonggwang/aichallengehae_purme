import Link from 'next/link';
import SafetyBanner from '@/components/SafetyBanner';
import SiteNav from '@/components/SiteNav';
import { SCALE } from '@/lib/mockData';

export default function PrdPage() {
  const stats = [
    { v: SCALE.therapists, l: '치료사' },
    { v: SCALE.therapies, l: '치료 종목' },
    { v: SCALE.childrenManaged, l: '관리 아동' },
    { v: SCALE.coordinators, l: '코디네이터' },
  ];

  return (
    <main className="mx-auto max-w-6xl px-5 pb-24 pt-6">
      <SafetyBanner />
      <SiteNav />

      <header className="mb-10">
        <p className="text-[13px] font-semibold tracking-wide text-teal">치료 재배정 보조 시스템</p>
        <h1 className="mt-1.5 text-[30px] font-bold leading-tight sm:text-[36px]">혹시 지금 자리 있나요</h1>
        <p className="mt-1 text-[15px] font-semibold text-ink">보강 브릿지</p>
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

      <section className="mb-8">
        <h2 className="mb-1 text-[13px] font-semibold tracking-wide text-teal">한 줄 정의</h2>
        <p className="rounded-xl3 border border-line bg-card p-5 text-[16px] font-semibold leading-relaxed text-ink">
          병원 코디네이터 2명이 결석으로 빈 회기를 대기 중인 재원 아동에게 연결할 수 있도록 돕는 도구입니다.
          <span className="mt-2 block text-[13px] font-normal text-muted">
            효용 단위는 &apos;회기(session)&apos;입니다. 시간 절감이나 오류 감소가 아니라, 회수된 치료
            회기 1건을 가치 1단위로 봅니다. 직접 사용자는 코디네이터 2명이며, 아동은 사용자가 아니라 수혜자입니다.
          </span>
        </p>
      </section>

      <section className="mb-8 grid gap-4 sm:grid-cols-3">
        <Card
          badge="문제"
          tone="amber"
          body="빈 회기도 알고 대기자도 아는데, 둘을 잇는 일만 사람 손에 남아 있습니다. 결석 안내는 보호자마다 표현이 달라 자유 형식이며, 정규식 같은 고정 규칙만으로는 절반은 놓칩니다."
        />
        <Card
          badge="해결"
          tone="teal"
          body="AI는 결석 문자를 읽고 항목(대상·날짜·범위·종목)만 추출합니다. 비는 회기 계산과 후보 순위는 결정론적 규칙 엔진이 담당합니다. 최종 배정은 담당자가 확정합니다."
        />
        <Card
          badge="차별점"
          tone="ink"
          body="AI에게 배정 우선순위를 맡기지 않습니다. 우선순위는 잔여 기회 적은 순 → 대기 경과일 긴 순 → ID 오름차순의 형평 기준으로만 계산되며, 수익성이나 배정 용이성으로 정렬하지 않습니다."
        />
      </section>

      <section className="mb-8 rounded-xl3 border border-line bg-card p-5">
        <h2 className="text-[15px] font-bold">데이터는 어떻게 보호되는가</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted">
          데이터 경계는 모델이 아니라 파이프라인 구조로 확보합니다. 접수 직후 식별정보(이름·등록번호)를
          토큰으로 치환하며, 이후 모델 추출과 매칭은 토큰만으로 수행됩니다. 실명은 담당자 안내 직전에만
          복원됩니다. 이 구조에서는 로컬 모델이든 외부 API든 식별정보 노출 여부가 달라지지 않습니다.
        </p>
      </section>

      <section className="mb-10 grid gap-4 sm:grid-cols-2">
        <Link href="/mvp"
          className="group rounded-xl3 border border-line bg-card p-5 transition hover:border-teal">
          <span className="text-[11px] font-semibold text-muted">2. MVP</span>
          <h3 className="mt-1 text-[17px] font-bold group-hover:text-teal">MVP 범위 보기</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            무엇을 만들고, 무엇을 의도적으로 만들지 않았는지 정리했습니다.
          </p>
        </Link>
        <Link href="/app"
          className="group rounded-xl3 border border-line bg-card p-5 transition hover:border-teal">
          <span className="text-[11px] font-semibold text-muted">3. 데모</span>
          <h3 className="mt-1 text-[17px] font-bold group-hover:text-teal">데모 체험하기</h3>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">
            예시 버튼 하나로 결석 문자 입력부터 보강 후보 제시까지 전체 흐름을 체험합니다.
          </p>
        </Link>
      </section>

      <footer className="border-t border-line pt-5 text-xs leading-relaxed text-muted">
        보강 브릿지 · AI 챌린지 해 예선 제출용 시연 프로토타입<br />
        표시된 아동·치료사·일정은 전부 가상 데이터이며 실제 진료 정보가 아닙니다.
      </footer>
    </main>
  );
}

function Card({ badge, tone, body }: { badge: string; tone: 'amber' | 'teal' | 'ink'; body: string }) {
  const toneCls: Record<string, string> = {
    amber: 'bg-amber/15 text-amber',
    teal: 'bg-teal/15 text-teal',
    ink: 'bg-ink/10 text-ink',
  };
  return (
    <div className="rounded-xl3 border border-line bg-card p-5">
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${toneCls[tone]}`}>{badge}</span>
      <p className="mt-3 text-[13px] leading-relaxed text-ink">{body}</p>
    </div>
  );
}

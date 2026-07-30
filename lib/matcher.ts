import {
  DEFAULT_WAITLIST, THERAPISTS, WaitEntry, TherapyCode,
  therapyByCode, therapistById,
} from './mockData';

export type Reason = { label: string; tone: 'match' | 'rank' | 'limit' };

export type Candidate = {
  entry: WaitEntry;
  reasons: Reason[];
  rankNote: string;
};

export type Excluded = { entry: WaitEntry; cause: string };

export type SlotMatch = {
  time: string;
  therapy: TherapyCode;
  therapistId: string;
  candidates: Candidate[];
  excluded: Excluded[];
  eligibleTherapists: number;
};

/**
 * 보강 후보 매칭 — 전부 결정론적 규칙이다. AI를 호출하지 않는다.
 *
 * 필수 조건(AND)
 *  1. 대기 항목의 종목이 빈 슬롯의 종목과 일치
 *  2. 잔여 기회 > 0  (이 기관에서는 잔여 처방 회기)
 *  3. 해당 시각에 다른 일정 없음
 *  4. 담당자가 해당 종목 수행 가능
 *
 * 우선순위(순차 적용)
 *  1. 잔여 기회 적은 순 — 소진 임박 우선
 *  2. 대기 경과일 긴 순 — 편중 방지
 *  3. childId 오름차순 — 동점 해소, 재현성 보장
 */
export function matchSlot(
  slot: { time: string; therapy: TherapyCode; therapistId: string },
  waitlist: WaitEntry[] = DEFAULT_WAITLIST,
  limit = 3,
): SlotMatch {
  const therapy = therapyByCode(slot.therapy);
  const therapist = therapistById(slot.therapistId);
  const excluded: Excluded[] = [];
  const passed: WaitEntry[] = [];

  const therapistCanDo = therapist ? therapist.skills.includes(slot.therapy) : false;

  for (const entry of waitlist) {
    if (entry.therapy !== slot.therapy) continue; // 다른 종목은 후보 대상 아님
    if (entry.remaining <= 0) {
      excluded.push({ entry, cause: '잔여 기회 없음' });
      continue;
    }
    if (entry.busyTimes.includes(slot.time)) {
      excluded.push({ entry, cause: `${slot.time} 다른 치료 있음` });
      continue;
    }
    passed.push(entry);
  }

  passed.sort((a, b) => {
    const byRemaining = a.remaining - b.remaining;
    if (byRemaining !== 0) return byRemaining;
    const byWaiting = b.waitingDays - a.waitingDays;
    if (byWaiting !== 0) return byWaiting;
    return a.childId.localeCompare(b.childId);
  });

  const candidates: Candidate[] = passed.slice(0, limit).map((entry, i) => ({
    entry,
    reasons: [
      { label: therapy.name, tone: 'match' },
      { label: `잔여 ${entry.remaining}회`, tone: 'match' },
      { label: entry.admissionType, tone: 'match' },
      { label: `${slot.time} 가능`, tone: 'match' },
      { label: `${therapy.room} 정원 ${therapy.capacity}`, tone: 'limit' },
    ],
    rankNote:
      i === 0
        ? `잔여 ${entry.remaining}회로 소진이 가장 임박합니다`
        : `대기 ${entry.waitingDays}일 경과`,
  }));

  return {
    ...slot,
    candidates,
    excluded,
    eligibleTherapists: THERAPISTS.filter((t) => t.skills.includes(slot.therapy)).length,
  };
}

/** 결석 1건이 만드는 여러 슬롯을 한 번에 처리 */
export function matchAll(
  slots: { time: string; therapy: TherapyCode; therapistId: string }[],
  waitlist: WaitEntry[] = DEFAULT_WAITLIST,
): SlotMatch[] {
  return slots.map((s) => matchSlot(s, waitlist));
}

import { DEFAULT_WAITLIST, OUTPATIENT_DAY } from './mockData';

/**
 * 익명화 전처리 — n8n `익명화 전처리 (Python)` 노드와 동일한 규칙.
 *
 * 이 함수를 통과한 뒤로는 어떤 모델도 실명·연락처를 보지 않는다.
 * 따라서 모델 선택(로컬/외부)이 개인정보 경계와 분리된다.
 *
 * 매핑 테이블은 브라우저 메모리에만 존재하며 서버로 전송되지 않는다.
 */

export type AnonymizeResult = {
  original: string;
  anonymized: string;
  mapping: Record<string, string>; // 토큰 → 원본
  count: number;
};

/** 기관 명부. 운영 시에는 대기 명단에서 로드한다. */
function buildRoster(): Record<string, string> {
  const roster: Record<string, string> = {};
  for (const w of DEFAULT_WAITLIST) roster[w.alias] = w.childId;
  roster[OUTPATIENT_DAY.alias] = OUTPATIENT_DAY.childId;
  return roster;
}

const PATTERNS: [string, RegExp][] = [
  ['PHONE', /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g],
  ['RRN', /\d{6}[-\s]?[1-4]\d{6}/g],
  ['BIRTH', /(19|20)\d{2}[.\-/년\s]\s?\d{1,2}[.\-/월\s]\s?\d{1,2}\s?일?/g],
  ['CHART', /(등록번호|차트번호)\s*[:：]?\s*\d{4,}/g],
];

export function anonymize(text: string): AnonymizeResult {
  const mapping: Record<string, string> = {};
  let out = text;

  // 1) 명부 기반 치환 — 신뢰도가 가장 높으므로 먼저 적용
  const roster = buildRoster();
  for (const [name, token] of Object.entries(roster)) {
    if (out.includes(name)) {
      out = out.split(name).join(token);
      mapping[token] = name;
    }
  }

  // 2) 패턴 기반 치환
  const counters: Record<string, number> = {};
  for (const [kind, rx] of PATTERNS) {
    out = out.replace(rx, (m) => {
      counters[kind] = (counters[kind] ?? 0) + 1;
      const token = `<${kind}_${counters[kind]}>`;
      mapping[token] = m;
      return token;
    });
  }

  return {
    original: text,
    anonymized: out,
    mapping,
    count: Object.keys(mapping).length,
  };
}

/**
 * 재식별 — 토큰을 표시명으로 복원한다.
 * 매핑이 브라우저 메모리에만 있으므로 복원은 코디네이터 화면(승인 구간) 안에서만 일어나며,
 * 서버·모델로 나가는 데이터에는 절대 사용하지 않는다.
 */
export function reidentify(token: string, mapping: Record<string, string>): string {
  return mapping[token] ?? token;
}

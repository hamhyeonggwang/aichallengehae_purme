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

type RosterEntry = { pattern: string; token: string; display: string };

/**
 * 기관 명부. 운영 시에는 대기 명단에서 로드한다.
 *
 * 현장 결석 문자는 실명 대신 "OOO" 마스킹 표기와 등록번호로 대상자를 지칭하는 경우가
 * 많다. 등록번호도 명부 대조 방식으로 치환한다 — 정규식 추측이 아니라 알려진 등록번호와
 * 정확히 일치할 때만 치환하므로 오탐(false positive) 위험이 없다.
 * 치환 후 화면에 복원되는 값은 항상 표시용 별칭이며, 원문에 등장한 등록번호 자체는
 * 매핑에 남기지 않는다.
 */
function buildRoster(): RosterEntry[] {
  const rows: RosterEntry[] = [];
  const add = (regNumber: string, alias: string, childId: string) => {
    rows.push({ pattern: regNumber, token: childId, display: alias });
    rows.push({ pattern: alias, token: childId, display: alias });
  };
  for (const w of DEFAULT_WAITLIST) add(w.regNumber, w.alias, w.childId);
  add(OUTPATIENT_DAY.regNumber, OUTPATIENT_DAY.alias, OUTPATIENT_DAY.childId);
  return rows;
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
  //    긴 패턴부터 치환해 짧은 패턴이 긴 패턴의 일부를 먼저 먹어치우지 않게 한다
  const roster = buildRoster().sort((a, b) => b.pattern.length - a.pattern.length);
  for (const { pattern, token, display } of roster) {
    if (out.includes(pattern)) {
      out = out.split(pattern).join(token);
      mapping[token] = display;
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

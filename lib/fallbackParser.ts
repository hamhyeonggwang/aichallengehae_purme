import { DEFAULT_WAITLIST, THERAPIES, TherapyCode, OUTPATIENT_DAY } from './mockData';

export type Scope = 'all' | 'partial';

export type ExtractedFields = {
  subjectToken: string | null;            // 익명화 토큰 (C-01 형식). 실명·별칭이 아니다
  date: string | null;                    // "오늘" 등 원문 표현
  scope: Scope | null;
  cancelledTherapies: TherapyCode[] | null; // scope=partial일 때 결석 종목
  reason: string | null;
};

export type Confidence = Partial<Record<keyof ExtractedFields, number>>;

export type ExtractResult = {
  fields: ExtractedFields;
  confidence: Confidence;
  source: 'ai' | 'fallback';
  note?: string;
};

// 이 파서는 익명화를 거친 텍스트를 받는다. 별칭이 아니라 토큰(C-XX)을 찾아야 한다
const KNOWN_TOKENS = new Set([
  ...DEFAULT_WAITLIST.map((w) => w.childId),
  OUTPATIENT_DAY.childId,
]);

/**
 * 정규식 폴백 파서.
 * API가 죽어도 화면이 멈추지 않게 하는 보험이다.
 * 의도적으로 단순하다 — 이 파서가 놓치는 지점이 곧 AI가 필요한 지점이다.
 */
export function fallbackParse(text: string): ExtractResult {
  const fields: ExtractedFields = {
    subjectToken: null, date: null, scope: null,
    cancelledTherapies: null, reason: null,
  };
  const confidence: Confidence = {};

  const tokenHit = text.match(/C-\d{2}/);
  if (tokenHit && KNOWN_TOKENS.has(tokenHit[0])) {
    fields.subjectToken = tokenHit[0];
    confidence.subjectToken = 0.9;
  }

  const dateWord = text.match(/(오늘|내일|모레)/);
  if (dateWord) {
    fields.date = dateWord[1];
    confidence.date = 0.85;
  }

  // 언급된 치료 종목 수집
  const mentioned: TherapyCode[] = [];
  for (const t of THERAPIES) {
    if (t.aliases.some((a) => text.includes(a))) mentioned.push(t.code);
  }

  const hasOnlyMarker = /만\s*(빼|빠|제외|취소)/.test(text) || /만\s*(빼주|빠질)/.test(text);
  const hasAllMarker = /(전체|모두|다)\s*(못|안|결석|취소)/.test(text);
  // 유지 표지 — "물리치료는 그대로 받을게요"처럼 일부를 유지한다는 신호
  const hasKeepMarker = /그대로|[은는]\s*(받|올|갈)/.test(text);

  if (hasAllMarker && mentioned.length === 0) {
    fields.scope = 'all';
    confidence.scope = 0.8;
  } else if (hasOnlyMarker && mentioned.length > 0 && !hasKeepMarker) {
    // "수치료랑 감통만 빼주세요" — 언급된 것이 전부 결석 대상
    fields.scope = 'partial';
    fields.cancelledTherapies = mentioned;
    confidence.scope = 0.55;
    confidence.cancelledTherapies = 0.5;
  } else if (mentioned.length > 0) {
    // 취소 표지와 유지 표지가 공존하거나 구분이 불명확 — 언급된 종목을
    // 전부 취소로 넣으면 유지 대상까지 오판하므로, 추측하지 않고 기권한다
    fields.scope = null;
    fields.cancelledTherapies = null;
  }

  const reasonWord = text.match(/(열|미열|감기|장염|병원|입원|일정|여행|컨디션)/);
  if (reasonWord) {
    fields.reason = reasonWord[1];
    confidence.reason = 0.6;
  }

  return {
    fields,
    confidence,
    source: 'fallback',
    note: '규칙 기반 파서로 처리했습니다. 빈 항목은 직접 지정해 주세요.',
  };
}

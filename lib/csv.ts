import { WaitEntry, TherapyCode, THERAPIES } from './mockData';

/**
 * 대기 명단 CSV 파서.
 *
 * 이 파일이 이식성의 핵심이다. 다른 기관은 시스템을 바꾸지 않고
 * 아래 헤더 형식에 맞춘 CSV만 내보내면 그대로 사용할 수 있다.
 *
 * 헤더:
 *   child_id,alias,admission_type,therapy,remaining,waiting_days,busy_times
 * 예:
 *   C-01,아동 가,입원,HYDRO,1,19,10:00|14:00
 */

export const CSV_HEADER =
  'child_id,alias,admission_type,therapy,remaining,waiting_days,busy_times';

export type ParseReport = {
  entries: WaitEntry[];
  skipped: { line: number; reason: string }[];
};

const VALID_CODES = new Set(THERAPIES.map((t) => t.code));

export function parseWaitlistCsv(raw: string): ParseReport {
  const entries: WaitEntry[] = [];
  const skipped: { line: number; reason: string }[] = [];

  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { entries, skipped };

  // 헤더 유무 판별
  const start = lines[0].toLowerCase().includes('child_id') ? 1 : 0;

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const lineNo = i + 1;

    if (cols.length < 6) {
      skipped.push({ line: lineNo, reason: '열 개수 부족' });
      continue;
    }

    const [childId, alias, admission, therapy, remainingStr, waitingStr, busyStr] = cols;

    if (!VALID_CODES.has(therapy as TherapyCode)) {
      skipped.push({ line: lineNo, reason: `알 수 없는 치료 코드: ${therapy}` });
      continue;
    }
    if (admission !== '입원' && admission !== '낮병동') {
      skipped.push({ line: lineNo, reason: `재원 구분 오류: ${admission}` });
      continue;
    }

    const remaining = Number(remainingStr);
    const waitingDays = Number(waitingStr);
    if (!Number.isFinite(remaining) || !Number.isFinite(waitingDays)) {
      skipped.push({ line: lineNo, reason: '숫자 형식 오류' });
      continue;
    }

    entries.push({
      childId,
      alias,
      admissionType: admission,
      therapy: therapy as TherapyCode,
      remaining,
      waitingDays,
      busyTimes: (busyStr ?? '').split('|').map((t) => t.trim()).filter(Boolean),
    });
  }

  return { entries, skipped };
}

/** 샘플 CSV 생성 — 사용자가 형식을 바로 확인할 수 있도록 */
export function buildSampleCsv(entries: WaitEntry[]): string {
  const rows = entries.map((e) =>
    [e.childId, e.alias, e.admissionType, e.therapy, e.remaining, e.waitingDays,
      e.busyTimes.join('|')].join(','),
  );
  return [CSV_HEADER, ...rows].join('\n');
}

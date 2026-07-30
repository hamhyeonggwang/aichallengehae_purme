import { NextRequest, NextResponse } from 'next/server';
import { fallbackParse, ExtractResult } from '@/lib/fallbackParser';
import { THERAPIES, DEFAULT_WAITLIST, OUTPATIENT_DAY } from '@/lib/mockData';

export const runtime = 'nodejs';
export const maxDuration = 15;

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

// 서버에 도착하는 텍스트는 이미 익명화되어 있다. 모델이 보는 대상 식별자는 토큰뿐이다
const TOKENS = Array.from(
  new Set([...DEFAULT_WAITLIST.map((w) => w.childId), OUTPATIENT_DAY.childId]),
).join(', ');

const THERAPY_TABLE = THERAPIES
  .map((t) => `  ${t.code} = ${t.name} (보호자 표현: ${t.aliases.join(', ')})`)
  .join('\n');

const SYSTEM_PROMPT = `너는 소아 재활병원 치료 예약 담당자를 돕는 추출기다.
보호자가 보낸 결석 안내 문자에서 항목을 뽑아 JSON으로만 답한다.
문자는 익명화를 거쳤다. 아동 이름은 "C-01" 형식의 토큰으로 치환되어 있다.

치료 종목 코드:
${THERAPY_TABLE}

출력 형식(이것 외의 텍스트·백틱·설명 금지):
{
  "fields": {
    "subjectToken": string|null,
    "date": string|null,
    "scope": "all"|"partial"|null,
    "cancelledTherapies": string[]|null,
    "reason": string|null
  },
  "confidence": {
    "subjectToken": number, "date": number,
    "scope": number, "cancelledTherapies": number, "reason": number
  }
}

규칙:
- 명시되지 않은 항목은 반드시 null. 추측해서 채우지 않는다.
- scope: 그날 예정된 치료를 전부 결석하면 "all", 일부만 결석하면 "partial".
- cancelledTherapies: scope가 "partial"일 때만 채운다. 결석하는 종목의 코드 배열.
  "A랑 B만 빼주세요"처럼 결석 대상이 명시되면 그것을 담는다.
  "A는 그대로 갑니다"처럼 유지 대상이 명시되면 그것은 제외한다.
  scope가 "all"이면 null.
- date: "오늘"/"내일"/"모레" 등 원문 표현을 그대로 둔다.
- reason: 결석 사유를 6자 이내 명사구로 요약. 없으면 null.
- subjectToken은 다음 중 하나로만 반환한다: ${TOKENS}. 목록에 없으면 null.
- confidence는 각 항목의 확신도 0~1. 애매하면 낮게 준다.`;

export async function POST(req: NextRequest) {
  let text = '';
  try {
    const body = await req.json();
    text = typeof body?.text === 'string' ? body.text : '';
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 });
  }

  if (!text.trim()) {
    return NextResponse.json({ error: '문자 내용을 입력해 주세요.' }, { status: 400 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json(fallbackParse(text) satisfies ExtractResult);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: 'user', parts: [{ text }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
        signal: controller.signal,
      },
    );
    clearTimeout(timer);
    if (!res.ok) throw new Error(`API ${res.status}`);

    const data = await res.json();
    const raw = ((data.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
      .map((p) => p.text ?? '')
      .join('')
      .replace(/```json|```/g, '')
      .trim();

    const parsed = JSON.parse(raw);
    if (!parsed?.fields) throw new Error('스키마 불일치');

    return NextResponse.json({
      fields: parsed.fields,
      confidence: parsed.confidence ?? {},
      source: 'ai',
    } satisfies ExtractResult);
  } catch {
    return NextResponse.json(fallbackParse(text) satisfies ExtractResult);
  }
}

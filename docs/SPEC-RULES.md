# 규칙 엔진 · 데이터 계약 (SPEC-RULES)

> 이 문서는 **매칭 로직의 정본**이다. `lib/matcher.ts`와 n8n `매칭 규칙 엔진` 노드는
> 이 명세의 두 구현체이며, 두 곳의 동작이 일치해야 한다.

---

## 1. 매칭 규칙

### 필수 조건 (AND)

1. 대기 항목의 `therapy`가 빈 회기의 종목과 **일치**
2. `remaining > 0`
3. 해당 시각이 `busyTimes`에 **없음**

### 우선순위 (순차 적용)

| 순위 | 기준 | 방향 | 근거 |
|---|---|---|---|
| 1 | `remaining` | 오름차순 | 잔여 기회 소진 임박자 우선 |
| 2 | `waitingDays` | 내림차순 | 대기 편중 방지 |
| 3 | `childId` | 오름차순 | 동점 해소 |

```ts
passed.sort((a, b) =>
  (a.remaining - b.remaining) ||
  (b.waitingDays - a.waitingDays) ||
  a.childId.localeCompare(b.childId)
);
```

**3단계 tie-breaker는 필수다.** 동일 입력에 동일 출력이 나와야
"AI가 아니라 규칙이 정한다"는 주장이 검증 가능해진다. 제거하지 않는다.

**형평 기준으로 정렬한다.** 수익성, 배정 용이성, 도착 가능 속도로 정렬하지 않는다.
이 선택은 제품의 성격을 규정하므로 코드 주석에 근거를 남긴다.

### 조건에 넣지 않는 것

| 항목 | 처리 | 이유 |
|---|---|---|
| 치료실 정원(`capacity`) | 배지로 표시만 | 결석으로 비는 자리는 이미 해당 치료실에 배정된 자리. 정원이 변하지 않음 |
| 담당자 수행 범위(`skills`) | 표시만 | 결석 슬롯의 담당자가 이미 그 종목을 수행 중 |
| 장비 준비 시간 | 미반영 | 미확인 항목 (DECISIONS.md B1 참조) |

---

## 2. 타입 정의

```ts
type Track = 'PT' | 'OT';

type TherapyCode =
  | 'PT_BASIC' | 'HYDRO' | 'ROBOT' | 'EQUIP'    // 물리치료 계열
  | 'OT_BASIC' | 'COG' | 'SI' | 'SWALLOW';      // 작업치료 계열

type Therapy = {
  code: TherapyCode;
  name: string;
  track: Track;
  room: string;
  capacity: number;    // 표시 전용
  aliases: string[];   // 보호자 구어체 표현 — 폴백 파서가 사용
};

type Therapist = {
  id: string;          // "PT-03"
  label: string;
  track: Track;
  skills: TherapyCode[];
};

/** 대기 1건 = 대상자 × 종목. CSV 한 줄에 대응 */
type WaitEntry = {
  childId: string;
  alias: string;              // 실명 금지
  admissionType: '입원' | '낮병동';
  therapy: TherapyCode;
  remaining: number;          // 잔여 기회
  waitingDays: number;
  busyTimes: string[];        // ["10:00", "14:00"]
};
```

### 8종 치료

| 코드 | 명칭 | 계열 | 치료실 | 정원 |
|---|---|---|---|---|
| `PT_BASIC` | 물리치료 | PT | 물리치료실 | 12 |
| `HYDRO` | 수치료 | PT | 수치료실 | 3 |
| `ROBOT` | 로봇치료 | PT | 로봇치료실 | 2 |
| `EQUIP` | 기구치료 | PT | 기구치료실 | 4 |
| `OT_BASIC` | 작업치료 | OT | 작업치료실 | 12 |
| `COG` | 전산화인지치료 | OT | 인지치료실 | 4 |
| `SI` | 감각통합치료 | OT | 감각통합실 | 5 |
| `SWALLOW` | 연하치료 | OT | 연하치료실 | 2 |

정원 값은 가상 데이터다. 실측값이 아니다.

---

## 3. CSV 스키마 — 이식 계약

```csv
child_id,alias,admission_type,therapy,remaining,waiting_days,busy_times
C-01,아동 가,입원,HYDRO,1,19,10:00|14:00
```

| 열 | 형식 | 비고 |
|---|---|---|
| `child_id` | 문자열 | 내부 식별자. 실명 금지 |
| `alias` | 문자열 | 화면 표시용 |
| `admission_type` | `입원` \| `낮병동` | 당일 이용 가능 여부 |
| `therapy` | TherapyCode | 위 표 참조 |
| `remaining` | 정수 | **잔여 기회** |
| `waiting_days` | 정수 | 대기 경과일 |
| `busy_times` | `HH:MM` `\|` 구분 | 비어 있어도 됨 |

### 도메인 중립성

`remaining`은 **잔여 기회**이며 의료 개념이 아니다. 필드명에 도메인 용어를 넣지 않는다.

| 이 스키마 | 재활병원 | 복지관 | 방문요양 | 상담센터 |
|---|---|---|---|---|
| `remaining` | 잔여 처방 회기 | 잔여 이용 횟수 | 월 한도 잔여 | 잔여 회기 |
| `admission_type` | 입원·낮병동 | 당일 이용 중 | 인근 수급자 | 대기 내담자 |

### 파싱 규칙

- 헤더 유무 자동 판별 (`child_id` 포함 여부)
- 열 개수 부족·알 수 없는 코드·숫자 형식 오류 → 해당 행만 건너뛰고 사유 기록
- 브라우저 메모리에서만 처리. 서버 전송 금지

---

## 4. 추출 결과 계약

```ts
type ExtractedFields = {
  subjectToken: string | null;        // 익명화 토큰 (C-01 형식). n8n과 동일 명칭
  date: string | null;                // "오늘" 등 원문 표현 유지
  scope: 'all' | 'partial' | null;
  cancelledTherapies: TherapyCode[] | null;  // scope=partial일 때만
  reason: string | null;
};

type ExtractResult = {
  fields: ExtractedFields;
  confidence: Partial<Record<keyof ExtractedFields, number>>;
  source: 'ai' | 'fallback';
  note?: string;
};
```

### 필수 동작

- 명시되지 않은 항목은 **반드시 `null`**. 추측값을 채우지 않는다
- `scope: 'all'` → 그날 예정된 전 회기가 빈다
- `scope: 'partial'` → `cancelledTherapies`에 있는 종목만 빈다
- `scope: null` → 빈 회기를 계산하지 않고 사용자에게 확인을 요청한다
- 신뢰도 < 0.7 → 화면에 "확신이 낮습니다" 표시

### 폴백 전환 조건

| 상황 | 동작 |
|---|---|
| API 키 없음 | 즉시 정규식 파서 |
| 타임아웃 8초 | 정규식 파서 |
| JSON 파싱 실패 | 정규식 파서 |
| 스키마 불일치 | 정규식 파서 |

**폴백 파서는 일부러 단순하게 유지한다.** 부분 결석에서 실패하는 모습이
AI 필요성의 증거이며, 이는 의도된 동작이다. 개선하지 않는다.

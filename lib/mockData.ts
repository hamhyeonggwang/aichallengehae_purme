// 전부 가상 데이터입니다. 실제 환자·치료사 정보가 아닙니다.

export type Track = 'PT' | 'OT';

/** 8종 치료 — 각 치료는 전용 공간/장비 제약을 가진다 */
export type TherapyCode =
  | 'PT_BASIC' | 'HYDRO' | 'ROBOT' | 'EQUIP'
  | 'OT_BASIC' | 'COG' | 'SI' | 'SWALLOW';

export type Therapy = {
  code: TherapyCode;
  name: string;
  track: Track;
  room: string;
  capacity: number;   // 동시 운영 가능 세션 수 — 공간·장비 제약
  aliases: string[];  // 보호자가 실제로 쓰는 표현
};

export const THERAPIES: Therapy[] = [
  { code: 'PT_BASIC', name: '물리치료',       track: 'PT', room: '물리치료실',  capacity: 12, aliases: ['물리', '물리치료', 'PT', '피티'] },
  { code: 'HYDRO',    name: '수치료',         track: 'PT', room: '수치료실',    capacity: 3,  aliases: ['수치료', '물속치료', '풀'] },
  { code: 'ROBOT',    name: '로봇치료',       track: 'PT', room: '로봇치료실',  capacity: 2,  aliases: ['로봇', '로봇치료', '보행로봇'] },
  { code: 'EQUIP',    name: '기구치료',       track: 'PT', room: '기구치료실',  capacity: 4,  aliases: ['기구', '기구치료'] },
  { code: 'OT_BASIC', name: '작업치료',       track: 'OT', room: '작업치료실',  capacity: 12, aliases: ['작업', '작업치료', 'OT', '오티'] },
  { code: 'COG',      name: '전산화인지치료', track: 'OT', room: '인지치료실',  capacity: 4,  aliases: ['인지', '전산화인지', '인지치료'] },
  { code: 'SI',       name: '감각통합치료',   track: 'OT', room: '감각통합실',  capacity: 5,  aliases: ['감통', '감각통합', '감각치료'] },
  { code: 'SWALLOW',  name: '연하치료',       track: 'OT', room: '연하치료실',  capacity: 2,  aliases: ['연하', '삼킴', '연하치료'] },
];

export const therapyByCode = (code: TherapyCode) =>
  THERAPIES.find((t) => t.code === code)!;

export type Therapist = {
  id: string;
  label: string;
  track: Track;
  skills: TherapyCode[]; // 전원이 전 종목을 하지는 않는다
};

function buildTherapists(): Therapist[] {
  const list: Therapist[] = [];
  const ptSpecials: TherapyCode[][] = [['HYDRO'], ['ROBOT'], ['EQUIP'], ['HYDRO', 'EQUIP'], []];
  const otSpecials: TherapyCode[][] = [['SI'], ['COG'], ['SWALLOW'], ['SI', 'COG'], []];
  for (let i = 1; i <= 40; i++) {
    list.push({
      id: `PT-${String(i).padStart(2, '0')}`,
      label: `물리치료사 ${i}`,
      track: 'PT',
      skills: ['PT_BASIC', ...ptSpecials[i % ptSpecials.length]],
    });
  }
  for (let i = 1; i <= 40; i++) {
    list.push({
      id: `OT-${String(i).padStart(2, '0')}`,
      label: `작업치료사 ${i}`,
      track: 'OT',
      skills: ['OT_BASIC', ...otSpecials[i % otSpecials.length]],
    });
  }
  return list;
}

export const THERAPISTS = buildTherapists();
export const therapistById = (id: string) => THERAPISTS.find((t) => t.id === id);

/**
 * 대기자 1건 = 대상자 × 서비스 종목 (CSV 한 줄에 대응)
 *
 * remaining = 잔여 기회.
 *   이 기관에서는 "잔여 처방 회기"지만, 도메인에 종속되지 않는 개념이다.
 *   복지관이면 잔여 이용 횟수, 방문요양이면 월 한도 잔여, 상담센터면 잔여 회기가 된다.
 *   대기자가 서비스를 받을 수 있는 남은 횟수이기만 하면 된다.
 */
export type WaitEntry = {
  childId: string;
  regNumber: string;   // 등록번호. 현장 결석 문자에 실제로 등장하는 4~5자리 식별자 — 실명이 아니다
  alias: string;
  admissionType: '입원' | '낮병동'; // 타 기관에서는 "당일 이용 가능" 구분에 대응
  therapy: TherapyCode;
  remaining: number;   // 잔여 기회
  waitingDays: number;
  busyTimes: string[];
};

export const DEFAULT_WAITLIST: WaitEntry[] = [
  { childId: 'C-01', regNumber: '10101', alias: '아동 가', admissionType: '입원',   therapy: 'PT_BASIC', remaining: 2, waitingDays: 12, busyTimes: ['10:00', '14:00'] },
  { childId: 'C-01', regNumber: '10101', alias: '아동 가', admissionType: '입원',   therapy: 'HYDRO',    remaining: 1, waitingDays: 19, busyTimes: ['10:00', '14:00'] },
  { childId: 'C-02', regNumber: '10102', alias: '아동 나', admissionType: '낮병동', therapy: 'PT_BASIC', remaining: 6, waitingDays: 3,  busyTimes: ['11:00'] },
  { childId: 'C-02', regNumber: '10102', alias: '아동 나', admissionType: '낮병동', therapy: 'SI',       remaining: 4, waitingDays: 9,  busyTimes: ['11:00'] },
  { childId: 'C-03', regNumber: '10103', alias: '아동 다', admissionType: '입원',   therapy: 'PT_BASIC', remaining: 4, waitingDays: 21, busyTimes: ['09:30'] },
  { childId: 'C-03', regNumber: '10103', alias: '아동 다', admissionType: '입원',   therapy: 'ROBOT',    remaining: 3, waitingDays: 25, busyTimes: ['09:30'] },
  { childId: 'C-04', regNumber: '10104', alias: '아동 라', admissionType: '낮병동', therapy: 'PT_BASIC', remaining: 1, waitingDays: 8,  busyTimes: ['15:00'] },
  { childId: 'C-04', regNumber: '10104', alias: '아동 라', admissionType: '낮병동', therapy: 'COG',      remaining: 5, waitingDays: 6,  busyTimes: ['15:00'] },
  { childId: 'C-05', regNumber: '10105', alias: '아동 마', admissionType: '입원',   therapy: 'OT_BASIC', remaining: 3, waitingDays: 14, busyTimes: [] },
  { childId: 'C-05', regNumber: '10105', alias: '아동 마', admissionType: '입원',   therapy: 'SWALLOW',  remaining: 2, waitingDays: 30, busyTimes: [] },
  { childId: 'C-06', regNumber: '10106', alias: '아동 바', admissionType: '낮병동', therapy: 'PT_BASIC', remaining: 7, waitingDays: 2,  busyTimes: ['13:30', '16:00'] },
  { childId: 'C-06', regNumber: '10106', alias: '아동 바', admissionType: '낮병동', therapy: 'EQUIP',    remaining: 2, waitingDays: 17, busyTimes: ['13:30', '16:00'] },
  { childId: 'C-07', regNumber: '10107', alias: '아동 사', admissionType: '입원',   therapy: 'SI',       remaining: 1, waitingDays: 11, busyTimes: [] },
  { childId: 'C-08', regNumber: '10108', alias: '아동 아', admissionType: '낮병동', therapy: 'HYDRO',    remaining: 2, waitingDays: 22, busyTimes: ['14:30'] },
];

/** 외래 아동의 하루 일정 — 결석 시 이 4건이 한꺼번에 빈다 */
export type OutpatientSession = {
  time: string;
  therapy: TherapyCode;
  therapistId: string;
};

export const OUTPATIENT_DAY = {
  childId: 'C-09', // 익명화 토큰. 대기 명단의 child_id와 같은 체계를 쓴다
  regNumber: '10109', // 등록번호. 결석 문자에는 이 번호로 등장한다
  alias: '아동 자',
  sessions: [
    { time: '14:00', therapy: 'PT_BASIC', therapistId: 'PT-03' },
    { time: '14:30', therapy: 'HYDRO',    therapistId: 'PT-04' },
    { time: '15:00', therapy: 'OT_BASIC', therapistId: 'OT-07' },
    { time: '15:30', therapy: 'SI',       therapistId: 'OT-11' },
  ] as OutpatientSession[],
};

export const SAMPLE_MESSAGES = [
  {
    level: '기본',
    note: '전체 결석 · 대상 명시',
    text: '안녕하세요 OOO 보호자입니다(등록번호 10109). 오늘 오후 치료 전체 못 갑니다.',
  },
  {
    level: '생략',
    note: '시각·치료명 생략, 사유만 있음',
    text: '선생님 죄송해요 애가 새벽부터 열이 나서 오늘 못 갈 것 같아요ㅠㅠ 다음주 화요일쯤은 괜찮을 것 같은데 그때 다시 연락드릴게요',
  },
  {
    level: '부분 결석',
    note: '4건 중 2건만 결석 — 규칙 기반 처리가 불가능한 지점',
    text: '오늘 수치료랑 감통만 빼주세요. 물리치료랑 작업치료는 그대로 받을게요!',
  },
];

/** 현장 규모 — 화면 상단 지표 */
export const SCALE = {
  therapists: 80,
  therapies: 8,
  coordinators: 2,
  childrenManaged: 120,
  dailyAbsentChildren: 15,
  sessionsPerOutpatient: 4,
  dailyOpenSlots: 60,        // 15 × 4
  broadcastJudgements: 4800, // 60 × 80
};

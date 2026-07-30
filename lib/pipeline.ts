/**
 * 실행 경로 정의.
 *
 * 각 단계는 n8n/workflow.json의 노드와 1:1로 대응한다.
 * 웹 프로토타입과 n8n 워크플로우가 같은 순서·같은 담당으로 동작함을 보이기 위한 구조다.
 */

export type Owner = 'AI' | '규칙' | '사람' | '입력';
export type Runtime = 'JS' | 'Python' | 'HTTP' | 'File' | '—';
export type StageStatus = 'idle' | 'done' | 'skipped' | 'fallback';

export type StageDef = {
  key: string;
  node: string;      // n8n 노드명
  label: string;     // 화면 표시명
  owner: Owner;
  runtime: Runtime;
  note: string;
};

export const STAGES: StageDef[] = [
  {
    key: 'intake',
    node: '결석 접수 수신',
    label: '접수',
    owner: '입력',
    runtime: '—',
    note: '코디네이터·치료사·보호자 어느 쪽이든 이 하나로 수렴',
  },
  {
    key: 'anonymize',
    node: '익명화 전처리',
    label: '익명화',
    owner: '규칙',
    runtime: 'Python',
    note: '이 단계 이후 실명은 파이프라인에 존재하지 않음',
  },
  {
    key: 'extract',
    node: '모델 추출',
    label: '추출',
    owner: 'AI',
    runtime: 'HTTP',
    note: '익명 텍스트만 전달. 모델 교체가 경계에 영향을 주지 않음',
  },
  {
    key: 'waitlist',
    node: '대기 명단 읽기·파싱',
    label: '대기 명단',
    owner: '규칙',
    runtime: 'File',
    note: '기관 CSV. 스키마만 맞추면 어느 기관이든 동일',
  },
  {
    key: 'match',
    node: '매칭 규칙 엔진',
    label: '매칭',
    owner: '규칙',
    runtime: 'JS',
    note: 'AI 미호출. 토큰만 다룸. 동일 입력 → 동일 출력',
  },
  {
    key: 'reidentify',
    node: '재식별 매칭',
    label: '재식별',
    owner: '규칙',
    runtime: 'Python',
    note: '발송 직전. 실명이 복원되는 유일한 지점',
  },
  {
    key: 'approve',
    node: '승인 큐로 전달',
    label: '승인',
    owner: '사람',
    runtime: '—',
    note: '자동 발송하지 않음. 사람이 확정',
  },
];

export type TraceEntry = {
  key: string;
  status: StageStatus;
  summary: string;
  detail?: string;
};

export type Trace = Record<string, TraceEntry>;

export const OWNER_TONE: Record<Owner, string> = {
  AI: 'bg-teal/15 text-teal',
  규칙: 'bg-ink/10 text-ink',
  사람: 'bg-amber/20 text-ink',
  입력: 'bg-muted/15 text-muted',
};

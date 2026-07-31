import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '보강 브릿지 — 혹시 지금 자리 있나요',
  description:
    "치료가 취소되면 그 시간은 비고, 같은 시간에 그 치료를 기다리는 아동이 있습니다. 현장에서는 이 연결을 '보강'이라 부릅니다. 가상 데이터 기반 시연용 프로토타입입니다.",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return children;
}

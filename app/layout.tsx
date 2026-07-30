import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '보강 브릿지 — 결석 슬롯 회수 어시스턴트',
  description:
    '결석으로 비는 치료 슬롯을 잔여 처방이 남은 재원 아동에게 연결합니다. 가상 데이터 기반 시연용 프로토타입입니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

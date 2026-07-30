import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '보강 브릿지 — 치료 재배정 보조 시스템',
  description:
    '치료가 취소되면 그 시간은 비고, 같은 시간에 그 치료를 기다리는 아동이 있습니다. 후보를 찾는 일은 자동으로, 배정은 담당자가 결정합니다. 가상 데이터 기반 시연용 프로토타입입니다.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}

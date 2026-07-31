import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '보강 브릿지 — MVP 범위',
  description: '보강 브릿지가 만드는 것과 의도적으로 만들지 않는 것을 정리한 MVP 범위 페이지입니다.',
};

export default function MvpLayout({ children }: { children: React.ReactNode }) {
  return children;
}

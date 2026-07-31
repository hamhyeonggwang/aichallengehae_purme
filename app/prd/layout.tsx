import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '보강 브릿지 — PRD',
  description:
    '치료 재배정 보조 시스템 보강 브릿지의 문제·해결·차별점을 정리한 소개 페이지입니다.',
};

export default function PrdLayout({ children }: { children: React.ReactNode }) {
  return children;
}

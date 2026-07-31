'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS = [
  { href: '/prd', num: '1', label: 'PRD' },
  { href: '/mvp', num: '2', label: 'MVP' },
  { href: '/app', num: '3', label: '데모(웹앱)' },
];

export default function SiteNav() {
  const pathname = usePathname();
  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-line pb-4">
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition ${
              active ? 'bg-ink text-ivory' : 'border border-line text-muted hover:border-teal hover:text-ink'
            }`}
          >
            {item.num}. {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { StaffRule } from './StaffRule';

const NAV_ITEMS = [{ label: 'Dashboard', href: '/dashboard' }];
const TOOLS = [{ label: 'Programme Notes', href: '/tools/programme-notes' }];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-[220px] shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-bg-surface)] px-4 py-6">
      <Link href="/dashboard" className="mb-1 text-[18px] font-semibold text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>
        Tonassist
      </Link>
      <StaffRule className="mb-6 w-full" />
      <nav className="flex flex-col gap-1">
        <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">Navigation</p>
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}
            className={`rounded-[6px] px-3 py-1.5 text-[13px] transition-colors ${pathname === item.href ? 'bg-[var(--color-brand-green)]/10 font-medium text-[var(--color-brand-green)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
            {item.label}
          </Link>
        ))}
        <p className="mb-1 mt-4 text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--color-text-muted)]">Tools</p>
        {TOOLS.map((tool) => (
          <Link key={tool.href} href={tool.href}
            className={`rounded-[6px] px-3 py-1.5 text-[13px] transition-colors ${pathname.startsWith(tool.href) ? 'bg-[var(--color-brand-green)]/10 font-medium text-[var(--color-brand-green)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]'}`}>
            {tool.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

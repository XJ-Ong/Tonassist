import Link from 'next/link';
export function ToolCard({ name, description, href }: { name: string; description: string; href: string }) {
  return (
    <Link href={href} className="block rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-surface)] p-5 transition-colors hover:border-[var(--color-brand-green)]">
      <h3 className="mb-1 text-[13px] font-medium text-[var(--color-text-primary)]">{name}</h3>
      <p className="text-[11px] text-[var(--color-text-secondary)]">{description}</p>
    </Link>
  );
}

import { ToolCard } from '@/components/layout/ToolCard';

export default function DashboardPage() {
  return (
    <>
      <h1 className="mb-6 text-[20px] font-medium text-[var(--color-text-primary)]" style={{ fontFamily: 'var(--font-playfair)' }}>Dashboard</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <ToolCard name="Programme Notes" description="Generate Canva-ready .pptx programme notes from Google Form responses." href="/dashboard/tools/programme-notes" />
        <div className="flex items-center justify-center rounded-[10px] border border-dashed border-[var(--color-border)] bg-[var(--color-bg-subtle)]/50 p-5">
          <p className="text-[11px] text-[var(--color-text-muted)]">More tools coming soon</p>
        </div>
      </div>
    </>
  );
}

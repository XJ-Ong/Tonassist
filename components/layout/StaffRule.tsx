export function StaffRule({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-col gap-[3px] ${className}`} aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-px w-full" style={{ backgroundColor: 'var(--color-brand-green)', opacity: 0.2 }} />
      ))}
    </div>
  );
}

import { Sidebar } from './Sidebar';
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-[680px]">{children}</div>
      </main>
    </div>
  );
}

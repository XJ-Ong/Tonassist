'use client';

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from '@headlessui/react';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import type { AiReport } from '@/types/programme-notes';

export function AiReportModal({ open, onClose, aiReport }: { open: boolean; onClose: () => void; aiReport: AiReport | null }) {
  if (!aiReport) return null;

  const tabs = [
    aiReport.corrections.length > 0 && { key: 'corrections', label: 'Corrections' },
    aiReport.qa.length > 0 && { key: 'qa', label: 'Proofread Introductions' },
    aiReport.drafts.length > 0 && { key: 'drafts', label: 'Drafted Introductions' },
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <Modal open={open} onClose={onClose} title="AI Processing Report" className="max-w-[560px] h-[65vh] flex flex-col">
      {tabs.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-[13px] text-[var(--color-text-secondary)]">No AI changes were made.</p>
        </div>
      ) : (
        <TabGroup className="flex flex-1 flex-col overflow-hidden">
          <TabList className="mb-3 flex flex-shrink-0 gap-1 border-b border-[var(--color-border)]">
            {tabs.map((t) => (
              <Tab key={t.key} className={({ selected }) => cn(
                'px-3 py-1.5 text-[12px] transition-colors focus:outline-none',
                selected ? 'border-b-2 border-[var(--color-text-primary)] text-[var(--color-text-primary)] font-medium' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              )}>
                {t.label}
              </Tab>
            ))}
          </TabList>
          <TabPanels className="flex-1 overflow-y-auto pr-1">
            {tabs.map((t) => (
              <TabPanel key={t.key}>
                {t.key === 'corrections' && (
                  <>
                    {aiReport.corrections.filter(c => c.field === 'composer').length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-[13px] font-semibold text-[var(--color-brand-green)]">Composer Name</p>
                        <ul className="space-y-1">
                          {aiReport.corrections.filter(c => c.field === 'composer').map((c, i) => (
                            <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                              <span className="font-medium text-[var(--color-text-primary)]">{c.performer}</span>
                              {' · '}
                              <span className="line-through">{c.original}</span>
                              {' → '}
                              <span>{c.corrected}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {aiReport.corrections.filter(c => c.field === 'piece').length > 0 && (
                      <div>
                        <p className="mb-1 text-[13px] font-semibold text-[var(--color-brand-green)]">Piece Name</p>
                        <ul className="space-y-1">
                          {aiReport.corrections.filter(c => c.field === 'piece').map((c, i) => (
                            <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                              <span className="font-medium text-[var(--color-text-primary)]">{c.performer}</span>
                              {' · '}
                              <span className="line-through">{c.original}</span>
                              {' → '}
                              <span>{c.corrected}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
                {t.key === 'qa' && (
                  <ul className="space-y-2">
                    {aiReport.qa.map((q, i) => (
                      <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                        <span className="font-medium text-[var(--color-text-primary)]">{q.performer}</span>
                        <ul className="mt-0.5 space-y-1">
                          {q.changes.map((c, j) => (
                            <li key={j} className="rounded-[4px] bg-[var(--color-bg-subtle)] p-2">
                              {c.original && <p className="line-through text-[var(--color-text-muted)]">{c.original}</p>}
                              {c.corrected && <p className={c.original ? 'mt-0.5' : ''}>{c.corrected}</p>}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
                {t.key === 'drafts' && (
                  <ul className="space-y-2">
                    {aiReport.drafts.map((d, i) => (
                      <li key={i} className="text-[12px] text-[var(--color-text-secondary)]">
                        <span className="font-medium text-[var(--color-text-primary)]">{d.performer}</span>
                        <p className="mt-0.5 rounded-[4px] bg-[var(--color-bg-subtle)] p-2">{d.text}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </TabPanel>
            ))}
          </TabPanels>
        </TabGroup>
      )}

      {aiReport.failed.length > 0 && (
        <div className="mt-3 flex-shrink-0 rounded-[4px] border-l-2 border-[var(--color-brand-red)] bg-[var(--color-brand-red)]/10 px-3 py-2 text-[12px] text-[var(--color-text-primary)]">
          Some AI steps were rate-limited and used fallback text instead.
        </div>
      )}
    </Modal>
  );
}

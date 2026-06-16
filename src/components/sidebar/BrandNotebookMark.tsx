interface BrandNotebookMarkProps {
  ariaLabel?: string
  className?: string
  testId?: string
}

/**
 * Compact brand mark for Grimoire's notebook-first identity.
 */
export function BrandNotebookMark({
  ariaLabel = 'Grimoire notebook mark',
  className,
  testId,
}: BrandNotebookMarkProps) {
  return (
    <svg
      aria-label={ariaLabel}
      className={['sidebar-brand-notebook-mark', className].filter(Boolean).join(' ')}
      data-testid={testId}
      role="img"
      viewBox="0 0 32 32"
    >
      <rect className="sidebar-brand-notebook-mark__cover" x="4.75" y="5.25" width="22.5" height="21.5" rx="4.75" />
      <path className="sidebar-brand-notebook-mark__page" d="M15.95 10.3c-2.7-1.42-5.14-1.75-7.58-.98v13.42c2.44-.77 4.88-.44 7.58.98V10.3Z" />
      <path className="sidebar-brand-notebook-mark__page" d="M16.05 10.3c2.7-1.42 5.14-1.75 7.58-.98v13.42c-2.44-.77-4.88-.44-7.58.98V10.3Z" />
      <path className="sidebar-brand-notebook-mark__spine" d="M16 9.45v15.2" />
      <path className="sidebar-brand-notebook-mark__rule" d="M10.15 13.2h3.3M10.15 16.45h3.8M10.15 19.7h3.25M18.55 13.2h3.3M18.05 16.45h3.8M18.6 19.7h3.25" />
      <circle className="sidebar-brand-notebook-mark__dot" cx="16" cy="24.58" r="0.92" />
    </svg>
  )
}

interface BrandWordmarkProps {
  ariaLabel?: string
  className?: string
  testId?: string
}

const WORDMARK_LETTERS = ['G', 'r', 'i', 'm', 'o', 'i', 'r', 'e']

/**
 * Hand-set handwritten wordmark surface for the sidebar brand.
 */
export function BrandWordmark({
  ariaLabel = 'Grimoire',
  className,
  testId,
}: BrandWordmarkProps) {
  return (
    <span
      aria-label={ariaLabel}
      className={['sidebar-brand-wordmark', className].filter(Boolean).join(' ')}
      data-testid={testId}
      role="img"
    >
      <span className="sidebar-brand-wordmark__text" aria-hidden="true">
        {WORDMARK_LETTERS.map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            className="sidebar-brand-wordmark__letter"
            data-letter-index={index}
          >
            {letter}
          </span>
        ))}
      </span>
    </span>
  )
}

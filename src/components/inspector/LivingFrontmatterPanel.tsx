import type { LivingFrontmatterHint, LivingFrontmatterSuggestedValue } from '../../lib/livingFrontmatter'
import { canApplyHint, formatSuggestedValue } from './livingFrontmatterRows'

interface LivingFrontmatterPanelProps {
  /** Page-level hints only; field hints render under their field in the properties grid. */
  hints: readonly LivingFrontmatterHint[]
  onApplySuggestion?: (field: string, value: LivingFrontmatterSuggestedValue) => void
}

/** One quiet line per page-level hint (duplicates, graph shape), with an Apply when it is safe to write. */
export function LivingFrontmatterPanel({ hints, onApplySuggestion }: LivingFrontmatterPanelProps) {
  if (hints.length === 0) return null

  return (
    <ul className="living-hints" data-testid="living-frontmatter-panel" aria-label="Suggestions">
      {hints.slice(0, 5).map((hint) => {
        const applicable = !!onApplySuggestion && canApplyHint(hint)
        return (
          <li
            key={hint.id}
            className="living-hint"
            data-testid="living-frontmatter-hint"
            data-severity={hint.severity}
            data-kind={hint.kind}
          >
            <span className="living-hint__label">{hint.label}</span>
            <span className="living-hint__detail" title={hint.detail}>{hint.detail}</span>
            {applicable ? (
              <button
                type="button"
                className="living-hint__apply"
                onClick={() => onApplySuggestion(hint.field, hint.suggestedValue)}
                title={`Set ${hint.field} to ${formatSuggestedValue(hint.suggestedValue)}`}
              >
                Apply
              </button>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

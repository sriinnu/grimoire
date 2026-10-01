import { Check } from 'lucide-react'

/** One row: a leading column that holds the check when this is the current state, then the label. */
export function MenuItem({ label, checked, disabled, onSelect, testId }: {
  label: string
  checked?: boolean
  disabled?: boolean
  onSelect: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={checked}
      className="note-menu__item"
      data-checked={checked ? 'true' : undefined}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
    >
      <span className="note-menu__lead" aria-hidden="true">
        {checked ? <Check className="note-menu__check" /> : null}
      </span>
      <span className="note-menu__label">{label}</span>
    </button>
  )
}

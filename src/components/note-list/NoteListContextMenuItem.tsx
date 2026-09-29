import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

/** One row: icon slot, label, and a check on the right when it is the current state. */
export function MenuItem({ icon, label, checked, disabled, onSelect, testId }: {
  icon?: ReactNode
  label: string
  checked?: boolean
  disabled?: boolean
  onSelect: () => void
  testId?: string
}) {
  return (
    <button
      type="button"
      role="menuitem"
      aria-checked={checked}
      className="note-menu__item"
      data-checked={checked ? 'true' : undefined}
      disabled={disabled}
      onClick={onSelect}
      data-testid={testId}
    >
      <span className="note-menu__icon" aria-hidden="true">{icon}</span>
      <span className="note-menu__label">{label}</span>
      {checked ? <Check className="note-menu__check" aria-hidden="true" /> : null}
    </button>
  )
}


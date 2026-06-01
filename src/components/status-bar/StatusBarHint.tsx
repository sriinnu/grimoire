import { useState, type ReactNode } from 'react'
import './StatusBarHint.css'

export interface StatusBarHintCopy {
  label: string
  shortcut?: string
}

interface StatusBarHintProps {
  align?: 'center' | 'end' | 'start'
  children: ReactNode
  copy: StatusBarHintCopy
}

function titleFromCopy(copy: StatusBarHintCopy) {
  return copy.shortcut ? `${copy.label} (${copy.shortcut})` : copy.label
}

/** Lightweight footer hint that avoids loading floating-ui on startup. */
export function StatusBarHint({ align = 'center', children, copy }: StatusBarHintProps) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className={`status-bar-hint status-bar-hint--${align}`}
      title={titleFromCopy(copy)}
      data-status-bar-hint={copy.label}
      onBlur={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible ? (
        <span className="status-bar-hint__bubble" role="tooltip">
          <span className="status-bar-hint__label">{copy.label}</span>
          {copy.shortcut ? <span className="status-bar-hint__shortcut">{copy.shortcut}</span> : null}
        </span>
      ) : null}
    </span>
  )
}

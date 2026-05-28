import { useState, type ReactNode, type RefObject } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  OPTION_BTN_STYLE,
  OPTION_DESC_STYLE,
  OPTION_ICON_STYLE,
  OPTION_LABEL_STYLE,
} from './welcomeScreenStyles'

interface WelcomeOptionButtonProps {
  icon: ReactNode
  iconBg: string
  label: string
  description: string
  loadingLabel?: string
  loadingDescription?: string
  onClick: () => void
  disabled: boolean
  loading?: boolean
  testId: string
  autoFocus?: boolean
  buttonRef?: RefObject<HTMLButtonElement | null>
}

export function WelcomeOptionButton({
  icon,
  iconBg,
  label,
  description,
  loadingLabel,
  loadingDescription,
  onClick,
  disabled,
  loading,
  testId,
  autoFocus = false,
  buttonRef,
}: WelcomeOptionButtonProps) {
  const [hover, setHover] = useState(false)

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      style={{
        ...OPTION_BTN_STYLE,
        background: hover ? 'var(--sidebar)' : 'var(--background)',
        opacity: disabled ? 0.7 : 1,
      }}
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      data-testid={testId}
      autoFocus={autoFocus}
      className="h-auto justify-start shadow-none"
      ref={buttonRef}
    >
      <div style={{ ...OPTION_ICON_STYLE, background: iconBg }}>
        {loading ? <Loader2 size={18} className="animate-spin" style={{ color: 'var(--muted-foreground)' }} /> : icon}
      </div>
      <div>
        <p style={OPTION_LABEL_STYLE}>{loading ? (loadingLabel ?? label) : label}</p>
        <p style={OPTION_DESC_STYLE}>{loading ? (loadingDescription ?? description) : description}</p>
      </div>
    </Button>
  )
}

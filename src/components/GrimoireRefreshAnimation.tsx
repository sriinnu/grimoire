import grimoireIcon from '@/assets/app-icon.png'
import './GrimoireRefreshAnimation.css'

interface GrimoireRefreshAnimationProps {
  detail?: string
  label?: string
}

/** Branded loading state for app refresh, startup, and native reload transitions. */
export function GrimoireRefreshAnimation({
  detail = 'Opening the vault',
  label = 'Loading…',
}: GrimoireRefreshAnimationProps) {
  return (
    <div
      aria-live="polite"
      className="grimoire-refresh"
      data-testid="grimoire-refresh-animation"
      role="status"
    >
      <div className="grimoire-refresh__scene" aria-hidden="true">
        <div className="grimoire-refresh__stage">
          <div className="grimoire-refresh__aura" />
          <div className="grimoire-refresh__floor" />
          <div className="grimoire-refresh__book">
            <div className="grimoire-refresh__page grimoire-refresh__page--left" />
            <div className="grimoire-refresh__page grimoire-refresh__page--right" />
            <div className="grimoire-refresh__orbit grimoire-refresh__orbit--one" />
            <div className="grimoire-refresh__orbit grimoire-refresh__orbit--two" />
            <img className="grimoire-refresh__icon" src={grimoireIcon} alt="" />
            <span className="grimoire-refresh__glint" />
          </div>
        </div>
        <span className="grimoire-refresh__spark grimoire-refresh__spark--one" />
        <span className="grimoire-refresh__spark grimoire-refresh__spark--two" />
        <span className="grimoire-refresh__spark grimoire-refresh__spark--three" />
      </div>
      <div className="grimoire-refresh__copy">
        <div className="grimoire-refresh__label">{label}</div>
        <div className="grimoire-refresh__detail">{detail}</div>
      </div>
    </div>
  )
}

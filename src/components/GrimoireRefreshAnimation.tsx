import './GrimoireRefreshAnimation.css'

interface GrimoireRefreshAnimationProps {
  detail?: string
  label?: string
}

/** Branded loading state for app refresh, startup, and native reload transitions. */
export function GrimoireRefreshAnimation({
  detail = 'Opening the notebook',
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
        <div className="grimoire-refresh__notebook">
          <span className="grimoire-refresh__cover" />
          <span className="grimoire-refresh__page grimoire-refresh__page--left" />
          <span className="grimoire-refresh__page grimoire-refresh__page--right" />
          <span className="grimoire-refresh__spine" />
          <span className="grimoire-refresh__rule grimoire-refresh__rule--one" />
          <span className="grimoire-refresh__rule grimoire-refresh__rule--two" />
          <span className="grimoire-refresh__rule grimoire-refresh__rule--three" />
        </div>
        <span className="grimoire-refresh__shadow" />
      </div>
      <div className="grimoire-refresh__copy">
        <div className="grimoire-refresh__label">{label}</div>
        <div className="grimoire-refresh__detail">{detail}</div>
      </div>
    </div>
  )
}

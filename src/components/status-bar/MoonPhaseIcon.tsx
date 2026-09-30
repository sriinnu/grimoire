import { litMoonPath, moonPhaseName } from './moonPhase'

/** The Moon as it is tonight: dark at Amavasya, growing through Shukla, full at Purnima, waning through Krishna. */
export function MoonPhaseIcon({ elongationDegrees, size = 12 }: { elongationDegrees: number; size?: number }) {
  const c = 8
  const r = 6.5
  const name = moonPhaseName(elongationDegrees)
  const lit = ((elongationDegrees % 360) + 360) % 360
  const full = name === 'Full moon'
  const dark = name === 'New moon'
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden="true"
      data-moon-phase={name}
      data-testid="status-panchangam-moon"
    >
      <circle cx={c} cy={c} r={r} fill="currentColor" opacity={0.18} />
      {full ? (
        <circle cx={c} cy={c} r={r} fill="currentColor" />
      ) : dark ? null : (
        <path d={litMoonPath(lit, c, r)} fill="currentColor" />
      )}
      <circle cx={c} cy={c} r={r} fill="none" stroke="currentColor" strokeWidth={0.75} opacity={0.55} />
    </svg>
  )
}

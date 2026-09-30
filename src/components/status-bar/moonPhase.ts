/**
 * The Moon's phase from the Sun–Moon elongation: names, and the SVG path of
 * the lit part of a disc, lit on the right while waxing and on the left while
 * waning, as seen from the northern hemisphere. The terminator is an ellipse
 * whose width follows cos(elongation).
 */
export function moonPhaseName(elongationDegrees: number): string {
  const e = ((elongationDegrees % 360) + 360) % 360
  if (e < 12 || e >= 348) return 'New moon'
  if (e < 84) return 'Waxing crescent'
  if (e < 96) return 'First quarter'
  if (e < 168) return 'Waxing gibbous'
  if (e < 192) return 'Full moon'
  if (e < 264) return 'Waning gibbous'
  if (e < 276) return 'Last quarter'
  return 'Waning crescent'
}

/** SVG path of the lit part for a radius-r disc centred at (c, c). */
export function litMoonPath(elongationDegrees: number, c: number, r: number): string {
  const e = ((elongationDegrees % 360) + 360) % 360
  const phase = (e * Math.PI) / 180
  const waxing = e <= 180
  const rx = Number(Math.abs(r * Math.cos(phase)).toFixed(3))
  // Outer limb on the lit side, then the terminator back to the top.
  const limbSweep = waxing ? 1 : 0
  const terminatorSweep = Math.cos(phase) > 0 ? (waxing ? 0 : 1) : (waxing ? 1 : 0)
  return [
    `M ${c} ${c - r}`,
    `A ${r} ${r} 0 0 ${limbSweep} ${c} ${c + r}`,
    `A ${rx} ${r} 0 0 ${terminatorSweep} ${c} ${c - r}`,
    'Z',
  ].join(' ')
}


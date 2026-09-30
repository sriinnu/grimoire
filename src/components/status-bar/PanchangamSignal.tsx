import { Moon } from 'lucide-react'
import { useMemo } from 'react'
import { computePanchangam, formatPanchangamDetail, formatPanchangamLine } from '../../lib/panchangam/panchangam'

/**
 * Today's tithi, nakshatra and vara in the status bar, computed on this
 * device. The bar's own ticker re-renders it every half minute while the
 * window is visible, so this owns no timer; the value is memoized by the
 * minute. Off in Settings → Native → Status bar.
 */
export function PanchangamSignal({ now }: { now?: () => Date }) {
  const instant = (now ?? (() => new Date()))()
  const minute = Math.floor(instant.getTime() / 60_000)
  const panchangam = useMemo(() => computePanchangam(new Date(minute * 60_000)), [minute])

  const detail = formatPanchangamDetail(panchangam)
  return (
    <span
      aria-label={detail}
      className="status-bar-summary-static"
      data-testid="status-panchangam"
      title={detail}
    >
      <span className="status-bar-summary-chip">
        <Moon size={12} />
        <span>{formatPanchangamLine(panchangam)}</span>
      </span>
    </span>
  )
}

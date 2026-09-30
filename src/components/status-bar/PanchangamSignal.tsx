import { Moon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { computePanchangam, formatPanchangamDetail, formatPanchangamLine } from '../../lib/panchangam/panchangam'

const REFRESH_MS = 60_000

/**
 * Today's tithi, nakshatra and vara in the status bar, recomputed every
 * minute on this device. Off in Settings → Native → Status bar.
 */
export function PanchangamSignal({ now }: { now?: () => Date }) {
  const read = now ?? (() => new Date())
  const [panchangam, setPanchangam] = useState(() => computePanchangam(read()))

  useEffect(() => {
    const timer = window.setInterval(() => setPanchangam(computePanchangam(read())), REFRESH_MS)
    return () => window.clearInterval(timer)
    // `read` is stable for the life of the bar; a new function means a new mount in tests.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

import { Button } from '@/components/ui/button'
import { cn } from '../../lib/utils'
import { CAPTURE_DATE_OPTIONS, type CaptureDateOffset } from './DashboardCaptureDatePickerModel'

/** Compact date chips for backfilling local journal and dream captures. */
export function DashboardCaptureDatePicker({
  customDate,
  selectedOffset,
  onSelect,
}: {
  customDate?: Date | null
  selectedOffset: CaptureDateOffset
  onSelect: (offset: CaptureDateOffset) => void
}) {
  const safeCustomDate = customDate instanceof Date && !Number.isNaN(customDate.getTime()) ? customDate : null
  const activeOffset = safeCustomDate ? null : selectedOffset

  return (
    <div className="vault-dashboard__capture-dates" aria-label="Capture date">
      {safeCustomDate ? (
        <span
          className="vault-dashboard__capture-date vault-dashboard__capture-date--active inline-flex items-center px-3"
          data-testid="dashboard-capture-custom-date"
        >
          {safeCustomDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      ) : null}
      {CAPTURE_DATE_OPTIONS.map(({ label, offset }) => (
        <Button
          key={offset}
          type="button"
          variant={activeOffset === offset ? 'secondary' : 'ghost'}
          size="sm"
          aria-pressed={activeOffset === offset}
          className={cn(
            'vault-dashboard__capture-date',
            activeOffset === offset && 'vault-dashboard__capture-date--active',
          )}
          data-testid={`dashboard-capture-date-${offset}`}
          onClick={() => onSelect(offset)}
        >
          {label}
        </Button>
      ))}
    </div>
  )
}

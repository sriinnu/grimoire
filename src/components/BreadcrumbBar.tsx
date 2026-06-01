import { memo } from 'react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useDragRegion } from '../hooks/useDragRegion'
import { BreadcrumbActions } from './BreadcrumbBarActions'
import { BreadcrumbTitle } from './BreadcrumbBarTitle'
import type { BreadcrumbBarProps } from './breadcrumbBarTypes'

/** Top editor breadcrumb and note action bar. */
export const BreadcrumbBar = memo(function BreadcrumbBar({
  entry,
  barRef,
  onRenameFilename,
  ...actionProps
}: BreadcrumbBarProps) {
  const { onMouseDown } = useDragRegion()

  return (
    <TooltipProvider>
      <div
        ref={barRef}
        data-tauri-drag-region
        data-title-hidden=""
        onMouseDown={onMouseDown}
        className="breadcrumb-bar flex shrink-0 items-center border-b border-transparent"
        style={{
          height: 52,
          background: 'var(--background)',
          padding: '6px 16px',
          boxSizing: 'border-box',
        }}
      >
        <div className="breadcrumb-bar__title min-w-0">
          <BreadcrumbTitle entry={entry} onRenameFilename={onRenameFilename} />
        </div>
        <div
          aria-hidden="true"
          data-tauri-drag-region
          className="breadcrumb-bar__drag-spacer min-w-0 flex-1"
        />
        <BreadcrumbActions entry={entry} {...actionProps} />
      </div>
    </TooltipProvider>
  )
})

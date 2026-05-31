import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardCaptureDatePicker } from './DashboardCaptureDatePicker'

describe('DashboardCaptureDatePicker', () => {
  it('shows a custom calendar-picked date without breaking offset chips', () => {
    const onSelect = vi.fn()
    render(
      <DashboardCaptureDatePicker
        customDate={new Date(2026, 4, 21)}
        selectedOffset={0}
        onSelect={onSelect}
      />,
    )

    expect(screen.getByTestId('dashboard-capture-custom-date')).toHaveTextContent('May 21')
    expect(screen.getByTestId('dashboard-capture-date-0')).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByTestId('dashboard-capture-date-1'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })

  it('ignores accidental event objects passed through capture callbacks', () => {
    render(
      <DashboardCaptureDatePicker
        customDate={new MouseEvent('click') as unknown as Date}
        selectedOffset={0}
        onSelect={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('dashboard-capture-custom-date')).not.toBeInTheDocument()
  })
})

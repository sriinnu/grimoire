import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { VaultRebuildProgressNotice } from './VaultRebuildProgressNotice'

describe('VaultRebuildProgressNotice', () => {
  it('renders scan progress and supports cancel', () => {
    const onCancel = vi.fn()

    render(
      <VaultRebuildProgressNotice
        progress={{
          operationId: 'rebuild-1',
          processedFiles: 2,
          totalFiles: 4,
          currentPath: 'notes/today.md',
          phase: 'scanning',
        }}
        onCancel={onCancel}
      />,
    )

    expect(screen.getByText('Scanning 2/4 - notes/today.md')).toBeInTheDocument()
    const notice = screen.getByTestId('vault-rebuild-progress-notice')
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    expect(notice).toHaveClass('animate-in')
    expect(notice).toHaveAttribute('data-motion-cancellable', 'true')
    expect(cancel).toHaveAttribute('data-motion-cancel-action', 'true')
    expect(cancel).toHaveClass('pointer-events-auto')
    expect(cancel).toHaveClass('z-10')
    expect(cancel).not.toBeDisabled()

    fireEvent.click(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('disables cancel while cancellation is pending', () => {
    render(
      <VaultRebuildProgressNotice
        progress={{
          operationId: 'rebuild-1',
          processedFiles: 2,
          totalFiles: 4,
          currentPath: null,
          phase: 'cancelling',
        }}
        onCancel={vi.fn()}
      />,
    )

    expect(screen.getByText('Cancelling vault rebuild...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})

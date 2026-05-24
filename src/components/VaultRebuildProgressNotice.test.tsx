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
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
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

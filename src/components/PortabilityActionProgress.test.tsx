import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import type { PortabilityProgressState } from '../lib/vaultPortability'
import { PortabilityActionProgress } from './PortabilityActionProgress'

const progress: PortabilityProgressState = {
  currentPath: 'imports/day-one/entry.md',
  label: 'Importing Day One',
  operationId: 'import-1',
  phase: 'copying',
  processedFiles: 4,
  totalFiles: 10,
}

describe('PortabilityActionProgress', () => {
  it('keeps cancel reachable while progress motion is active', () => {
    const onCancel = vi.fn()

    render(<PortabilityActionProgress progress={progress} onCancel={onCancel} t={createTranslator('en')} />)

    const surface = screen.getByTestId('settings-portability-progress')
    const cancel = screen.getByTestId('settings-portability-cancel')
    expect(surface).toHaveAttribute('data-motion-cancellable', 'true')
    expect(cancel).toHaveAttribute('data-motion-cancel-action', 'true')
    expect(cancel).toHaveClass('pointer-events-auto')
    expect(cancel).toHaveClass('z-10')
    expect(cancel).not.toBeDisabled()

    fireEvent.click(cancel)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('only disables cancel after cancellation has already started', () => {
    render(
      <PortabilityActionProgress
        progress={{ ...progress, phase: 'cancelling' }}
        onCancel={vi.fn()}
        t={createTranslator('en')}
      />,
    )

    expect(screen.getByText(/Cancelling import/)).toBeInTheDocument()
    expect(screen.getByTestId('settings-portability-cancel')).toBeDisabled()
  })
})

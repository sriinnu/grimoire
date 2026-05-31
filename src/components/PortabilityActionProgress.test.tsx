import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import type { PortabilityProgressState } from '../lib/vaultPortability'
import { PortabilityActionProgress } from './PortabilityActionProgress'

const progress: PortabilityProgressState = {
  actionId: 'day-one',
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

  it('uses export starting and cancelling copy for export actions', () => {
    const exportProgress = {
      ...progress,
      actionId: 'export-json-preview' as const,
      currentPath: null,
      label: 'JSON snapshot preview',
      processedFiles: 0,
      totalFiles: null,
    }

    render(<PortabilityActionProgress progress={exportProgress} t={createTranslator('en')} />)
    expect(screen.getByText('Preparing export...')).toBeInTheDocument()
    expect(screen.queryByText('Preparing import...')).not.toBeInTheDocument()

    render(
      <PortabilityActionProgress
        progress={{ ...exportProgress, phase: 'cancelling' }}
        onCancel={vi.fn()}
        t={createTranslator('en')}
      />,
    )
    expect(screen.getByText('Cancelling export...')).toBeInTheDocument()
  })

  it('uses storage proof starting and cancelling copy for storage actions', () => {
    const storageProgress = {
      ...progress,
      actionId: 'storage-azure-provider-push-preview' as const,
      currentPath: null,
      label: 'Azure proof preview',
      processedFiles: 0,
      totalFiles: null,
    }

    render(<PortabilityActionProgress progress={storageProgress} t={createTranslator('en')} />)
    expect(screen.getByText('Preparing storage proof...')).toBeInTheDocument()
    expect(screen.queryByText('Preparing import...')).not.toBeInTheDocument()

    render(
      <PortabilityActionProgress
        progress={{ ...storageProgress, phase: 'cancelling' }}
        onCancel={vi.fn()}
        t={createTranslator('en')}
      />,
    )
    expect(screen.getByText('Cancelling storage action...')).toBeInTheDocument()
  })

  it('uses export progress copy for export actions', () => {
    render(
      <PortabilityActionProgress
        progress={{
          ...progress,
          actionId: 'export-markdown-zip',
          currentPath: 'archive.zip',
          label: 'Markdown ZIP export',
        }}
        t={createTranslator('en')}
      />,
    )

    expect(screen.getByText(/Exported 4 of 10 files/)).toBeInTheDocument()
    expect(screen.queryByText(/Imported 4 of 10 files/)).not.toBeInTheDocument()
  })

  it('uses neutral progress copy for storage actions', () => {
    render(
      <PortabilityActionProgress
        progress={{
          ...progress,
          actionId: 'storage-s3-preview',
          currentPath: 'Notes/public.md',
          label: 'S3 push preview',
        }}
        t={createTranslator('en')}
      />,
    )

    expect(screen.getByText(/Processed 4 of 10 files/)).toBeInTheDocument()
    expect(screen.queryByText(/Imported 4 of 10 files/)).not.toBeInTheDocument()
  })
})

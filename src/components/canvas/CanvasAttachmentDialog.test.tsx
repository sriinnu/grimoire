import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { createCanvasDocument, type CanvasAttachment } from '../../utils/canvasAttachments'
import { CanvasAttachmentDialog } from './CanvasAttachmentDialog'
import {
  importCanvasImageToVault,
  loadCanvasDocumentState,
  saveCanvasDocument,
} from './canvasPersistence'

vi.mock('./canvasPersistence', () => ({
  importCanvasImageToVault: vi.fn(),
  loadCanvasDocumentState: vi.fn(),
  saveCanvasDocument: vi.fn(),
}))

vi.mock('../../utils/vault-dialog', () => ({
  pickFile: vi.fn(),
}))

vi.mock('@/components/ui/action-tooltip', () => ({
  ActionTooltip: ({ children }: { children: ReactNode }) => children,
}))

vi.mock('./CanvasDrawingSurface', () => ({
  CanvasDrawingSurface: ({ setDocument }: {
    setDocument: (updater: ReturnType<typeof createStrokeUpdater>) => void
  }) => (
    <button type="button" onClick={() => setDocument(createStrokeUpdater())}>
      Draw stroke
    </button>
  ),
}))

function createStrokeUpdater() {
  return (document: ReturnType<typeof createCanvasDocument>) => ({
    ...document,
    strokes: [
      ...document.strokes,
      {
        id: 'stroke-1',
        color: '#171717',
        size: 5,
        tool: 'pen' as const,
        points: [{ x: 1, y: 1, pressure: 0.5, at: 1 }],
      },
    ],
  })
}

const attachment: CanvasAttachment = {
  index: 0,
  title: 'Whiteboard',
  kind: 'whiteboard',
  source: 'attachments/board.grimoire-canvas.json',
  preview: 'attachments/board.png',
}

describe('CanvasAttachmentDialog', () => {
  beforeEach(async () => {
    const { pickFile } = await import('../../utils/vault-dialog')
    vi.mocked(pickFile).mockReset()
    vi.mocked(importCanvasImageToVault).mockReset()
    vi.mocked(loadCanvasDocumentState).mockReset()
    vi.mocked(saveCanvasDocument).mockReset()
  })

  it('enables first save when the canvas source has not been written yet', async () => {
    vi.mocked(loadCanvasDocumentState).mockResolvedValueOnce({
      document: createCanvasDocument('whiteboard'),
      sourceFound: false,
    })

    render(
      <CanvasAttachmentDialog
        attachment={attachment}
        onOpenChange={vi.fn()}
        open
        vaultPath="/vault"
      />,
    )

    expect(await screen.findByRole('status')).toHaveTextContent('Unsaved local canvas')
    const save = screen.getByRole('button', { name: /save/i })
    expect(save).toBeEnabled()

    await act(async () => {
      fireEvent.click(save)
    })

    expect(saveCanvasDocument).toHaveBeenCalledWith(
      '/vault',
      attachment,
      expect.objectContaining({ kind: 'whiteboard' }),
    )
  })

  it('keeps undo and save quiet until the user draws on an existing canvas', async () => {
    vi.mocked(loadCanvasDocumentState).mockResolvedValueOnce({
      document: createCanvasDocument('whiteboard'),
      sourceFound: true,
    })

    render(
      <CanvasAttachmentDialog
        attachment={attachment}
        onOpenChange={vi.fn()}
        open
        vaultPath="/vault"
      />,
    )

    const save = await screen.findByRole('button', { name: /save/i })
    expect(save).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    const drawStroke = await screen.findByRole('button', { name: 'Draw stroke' })

    await act(async () => {
      fireEvent.click(drawStroke)
    })

    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
    expect(save).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent('Unsaved local canvas')
  })

  it('imports a local image into the editable canvas before saving', async () => {
    const { pickFile } = await import('../../utils/vault-dialog')
    vi.mocked(loadCanvasDocumentState).mockResolvedValueOnce({
      document: createCanvasDocument('whiteboard'),
      sourceFound: true,
    })
    vi.mocked(pickFile).mockResolvedValueOnce('/Users/sriinnu/Desktop/photo.png')
    vi.mocked(importCanvasImageToVault).mockResolvedValueOnce('attachments/photo.png')

    render(
      <CanvasAttachmentDialog
        attachment={attachment}
        onOpenChange={vi.fn()}
        open
        vaultPath="/vault"
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Add Image' }))

    await waitFor(() => {
      expect(pickFile).toHaveBeenCalledWith('Add image to canvas', expect.any(Array))
      expect(importCanvasImageToVault).toHaveBeenCalledWith('/vault', '/Users/sriinnu/Desktop/photo.png')
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
    })

    expect(saveCanvasDocument).toHaveBeenCalledWith(
      '/vault',
      attachment,
      expect.objectContaining({
        images: [expect.objectContaining({ src: 'attachments/photo.png' })],
      }),
    )
  })
})

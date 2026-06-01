import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCanvasDocument, type CanvasAttachment } from '../../utils/canvasAttachments'
import {
  importCanvasImageToVault,
  loadCanvasDocument,
  loadCanvasDocumentState,
  saveCanvasDocument,
} from './canvasPersistence'

const mockInvoke = vi.hoisted(() => vi.fn())

vi.mock('../../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke: (...args: unknown[]) => mockInvoke(...args),
}))

vi.mock('./canvasDrawing', () => ({
  exportCanvasPreview: vi.fn(() => 'png-preview'),
}))

const attachment: CanvasAttachment = {
  index: 0,
  title: 'Sketch',
  kind: 'whiteboard',
  source: 'attachments/sketch.grimoire-canvas.json',
  preview: 'attachments/sketch.png',
}

describe('canvasPersistence', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('marks a missing canvas source as needing its first local save', async () => {
    mockInvoke.mockResolvedValueOnce('')

    const result = await loadCanvasDocumentState('/vault', attachment)

    expect(result.sourceFound).toBe(false)
    expect(result.document.kind).toBe('whiteboard')
    expect(mockInvoke).toHaveBeenCalledWith('get_note_content', {
      path: '/vault/attachments/sketch.grimoire-canvas.json',
      vaultPath: '/vault',
    })
  })

  it('keeps the legacy load helper returning only the parsed document', async () => {
    mockInvoke.mockResolvedValueOnce(JSON.stringify(createCanvasDocument('whiteboard')))

    await expect(loadCanvasDocument('/vault', attachment)).resolves.toMatchObject({
      kind: 'whiteboard',
      version: 1,
    })
  })

  it('saves editable source JSON before refreshing the preview image', async () => {
    mockInvoke.mockResolvedValue(null)

    await saveCanvasDocument('/vault', attachment, createCanvasDocument('whiteboard'))

    expect(mockInvoke).toHaveBeenNthCalledWith(1, 'save_note_content', {
      path: '/vault/attachments/sketch.grimoire-canvas.json',
      content: expect.stringContaining('"kind": "whiteboard"'),
      vaultPath: '/vault',
    })
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'save_canvas_preview', {
      vaultPath: '/vault',
      path: '/vault/attachments/sketch.png',
      data: 'png-preview',
    })
  })

  it('imports images as portable vault-relative canvas refs', async () => {
    mockInvoke.mockResolvedValueOnce('/vault/attachments/1700000000000-photo.png')

    await expect(importCanvasImageToVault('/vault', '/Users/sriinnu/Desktop/photo.png')).resolves.toBe(
      'attachments/1700000000000-photo.png',
    )
    expect(mockInvoke).toHaveBeenCalledWith('copy_image_to_vault', {
      vault_path: '/vault',
      source_path: '/Users/sriinnu/Desktop/photo.png',
    })
  })
})

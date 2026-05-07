import { invoke } from '@tauri-apps/api/core'
import { isTauri, mockInvoke } from '../../mock-tauri'
import {
  parseCanvasDocumentJson,
  resolveVaultAttachmentPath,
  type CanvasAttachment,
  type CanvasDocument,
} from '../../utils/canvasAttachments'
import { exportCanvasPreview } from './canvasDrawing'

function appInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

/** Loads the editable JSON source for a canvas attachment. */
export async function loadCanvasDocument(
  vaultPath: string,
  attachment: CanvasAttachment,
): Promise<CanvasDocument> {
  const sourcePath = resolveVaultAttachmentPath(vaultPath, attachment.source)
  try {
    const raw = await appInvoke<string>('get_note_content', { path: sourcePath, vaultPath })
    return parseCanvasDocumentJson(raw, attachment.kind)
  } catch {
    return parseCanvasDocumentJson('', attachment.kind)
  }
}

/** Saves editable canvas JSON and refreshes the Markdown preview image. */
export async function saveCanvasDocument(
  vaultPath: string,
  attachment: CanvasAttachment,
  document: CanvasDocument,
): Promise<void> {
  const sourcePath = resolveVaultAttachmentPath(vaultPath, attachment.source)
  const previewPath = resolveVaultAttachmentPath(vaultPath, attachment.preview)
  const content = JSON.stringify({ ...document, updatedAt: new Date().toISOString() }, null, 2)
  const previewData = exportCanvasPreview(document)

  await appInvoke('save_note_content', { path: sourcePath, content, vaultPath })
  await appInvoke('save_canvas_preview', { vaultPath, path: previewPath, data: previewData })
}

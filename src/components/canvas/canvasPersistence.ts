import { invoke } from '../../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../../mock-tauri'
import {
  parseCanvasDocumentJson,
  resolveVaultAttachmentPath,
  type CanvasAttachment,
  type CanvasDocument,
} from '../../utils/canvasAttachments'
import { resolveVaultImageSrc } from '../../utils/vaultImages'
import { exportCanvasPreview } from './canvasDrawing'

export interface CanvasDocumentLoadResult {
  document: CanvasDocument
  sourceFound: boolean
}

function appInvoke<T>(command: string, args: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

function relativeToVault(vaultPath: string, absolutePath: string): string {
  const root = vaultPath.replace(/\/+$/, '')
  return absolutePath.startsWith(`${root}/`)
    ? absolutePath.slice(root.length + 1)
    : absolutePath.replace(/^\/+/, '')
}

function copyImageArgs(vaultPath: string, sourcePath: string): Record<string, unknown> {
  return isTauri()
    ? { vaultPath, sourcePath }
    : { vault_path: vaultPath, source_path: sourcePath }
}

/** Loads the editable JSON source and reports whether the backing file already exists. */
export async function loadCanvasDocumentState(
  vaultPath: string,
  attachment: CanvasAttachment,
): Promise<CanvasDocumentLoadResult> {
  const sourcePath = resolveVaultAttachmentPath(vaultPath, attachment.source)
  try {
    const raw = await appInvoke<string>('get_note_content', { path: sourcePath, vaultPath })
    return {
      document: parseCanvasDocumentJson(raw, attachment.kind),
      sourceFound: raw.trim().length > 0,
    }
  } catch {
    return {
      document: parseCanvasDocumentJson('', attachment.kind),
      sourceFound: false,
    }
  }
}

/** Loads the editable JSON source for a canvas attachment. */
export async function loadCanvasDocument(
  vaultPath: string,
  attachment: CanvasAttachment,
): Promise<CanvasDocument> {
  return (await loadCanvasDocumentState(vaultPath, attachment)).document
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
  const previewData = await exportCanvasPreview(
    document,
    (src) => resolveVaultImageSrc(resolveVaultAttachmentPath(vaultPath, src)),
  )

  await appInvoke('save_note_content', { path: sourcePath, content, vaultPath })
  await appInvoke('save_canvas_preview', { vaultPath, path: previewPath, data: previewData })
}

/** Copies an image into the vault and returns the portable relative attachment path. */
export async function importCanvasImageToVault(
  vaultPath: string,
  sourcePath: string,
): Promise<string> {
  const savedPath = await appInvoke<string>('copy_image_to_vault', copyImageArgs(vaultPath, sourcePath))
  return relativeToVault(vaultPath, savedPath)
}

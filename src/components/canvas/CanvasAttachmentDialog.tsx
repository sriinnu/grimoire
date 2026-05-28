import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { pickFile } from '../../utils/vault-dialog'
import type { CanvasAttachment, CanvasDocument } from '../../utils/canvasAttachments'
import { createCanvasDocument } from '../../utils/canvasAttachments'
import { appendCanvasImage, CANVAS_COLORS, CANVAS_SIZES } from './canvasDrawing'
import { CanvasAttachmentToolbar } from './CanvasAttachmentToolbar'
import { CanvasDrawingSurface, type CanvasTool } from './CanvasDrawingSurface'
import { extractCanvasDocumentMarkdown } from './canvasMarkdownExtraction'
import {
  importCanvasImageToVault,
  loadCanvasDocumentState,
  saveCanvasDocument,
} from './canvasPersistence'
import './CanvasAttachment.css'

interface CanvasAttachmentDialogProps {
  attachment: CanvasAttachment | null
  onOpenChange: (open: boolean) => void
  open: boolean
  vaultPath?: string
}

function readThemeColor(variableName: string, fallback: string): string {
  const root = globalThis.document?.documentElement
  if (!root || !globalThis.getComputedStyle) return fallback
  const value = globalThis.getComputedStyle(root).getPropertyValue(variableName).trim()
  if (!value || value.includes('var(')) return fallback
  return value
}

function resolveCanvasInkPalette(): readonly string[] {
  return [
    readThemeColor('--text-primary', CANVAS_COLORS[0]),
    readThemeColor('--accent-red', CANVAS_COLORS[1]),
    readThemeColor('--accent-blue', CANVAS_COLORS[2]),
    readThemeColor('--accent-green', CANVAS_COLORS[3]),
    readThemeColor('--accent-purple', CANVAS_COLORS[4]),
    readThemeColor('--accent-orange', CANVAS_COLORS[5]),
  ]
}

function withThemeCanvasBackground(document: CanvasDocument): CanvasDocument {
  return {
    ...document,
    background: readThemeColor('--surface-card', document.background),
  }
}

/** Modal canvas editor for Markdown-backed handwriting and whiteboard attachments. */
export function CanvasAttachmentDialog({
  attachment,
  onOpenChange,
  open,
  vaultPath,
}: CanvasAttachmentDialogProps) {
  const [document, setDocument] = useState<CanvasDocument>(() => createCanvasDocument('handwriting'))
  const [tool, setTool] = useState<CanvasTool>('pen')
  const [color, setColor] = useState(CANVAS_COLORS[0])
  const [size, setSize] = useState(CANVAS_SIZES[1])
  const [textValue, setTextValue] = useState('Text')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const [addingImage, setAddingImage] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [extractState, setExtractState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const inkColors = useMemo(resolveCanvasInkPalette, [open])

  useEffect(() => {
    if (!open || !attachment) return
    setLoading(true)
    setDirty(false)
    setExtractState('idle')
    setSaveState('idle')
    setColor(inkColors[0] ?? CANVAS_COLORS[0])
    const fallback = withThemeCanvasBackground(createCanvasDocument(attachment.kind))
    if (!vaultPath) {
      setDocument(fallback)
      setLoading(false)
      return
    }
    void loadCanvasDocumentState(vaultPath, attachment).then((result) => {
      setDocument(result.sourceFound ? result.document : withThemeCanvasBackground(result.document))
      setDirty(!result.sourceFound)
    }).finally(() => setLoading(false))
  }, [attachment, inkColors, open, vaultPath])

  const updateDocument = useCallback((updater: (document: CanvasDocument) => CanvasDocument) => {
    setExtractState('idle')
    setSaveState('idle')
    setDirty(true)
    setDocument(updater)
  }, [])

  const handleAddImage = useCallback(async () => {
    if (!vaultPath) return
    setAddingImage(true)
    try {
      const sourcePath = await pickFile('Add image to canvas', [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'tiff'] },
      ])
      if (!sourcePath) return
      const imagePath = await importCanvasImageToVault(vaultPath, sourcePath)
      updateDocument((current) => appendCanvasImage(current, imagePath))
    } catch {
      setSaveState('error')
    } finally {
      setAddingImage(false)
    }
  }, [updateDocument, vaultPath])

  const handleSave = useCallback(async () => {
    if (!attachment || !vaultPath) return
    setSaving(true)
    try {
      await saveCanvasDocument(vaultPath, attachment, document)
      setDirty(false)
      setSaveState('saved')
    } catch {
      setSaveState('error')
    } finally {
      setSaving(false)
    }
  }, [attachment, document, vaultPath])

  const hasCanvasContent = document.strokes.length > 0
    || document.images.length > 0
    || document.shapes.length > 0
    || document.textBoxes.length > 0

  const handleCopyMarkdown = useCallback(async () => {
    if (!navigator.clipboard?.writeText) {
      setExtractState('failed')
      return
    }
    try {
      await navigator.clipboard.writeText(extractCanvasDocumentMarkdown(document, {
        title: attachment?.title,
      }))
      setExtractState('copied')
    } catch {
      setExtractState('failed')
    }
  }, [attachment, document])

  const statusCopy = loading
    ? 'Loading local source'
    : saving
      ? 'Saving local files'
      : extractState === 'copied'
        ? 'Markdown extraction copied locally'
        : extractState === 'failed'
          ? 'Markdown extraction copy failed'
      : saveState === 'error'
        ? 'Save failed'
        : !vaultPath
          ? 'Open a vault to save locally'
          : dirty
            ? 'Unsaved local canvas'
            : saveState === 'saved'
              ? 'Saved locally'
              : 'Local source ready'
  const saveDisabled = !vaultPath || saving || (!dirty && saveState !== 'error')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="canvas-attachment__dialog" showCloseButton>
        <DialogHeader>
          <DialogTitle>{attachment?.title ?? 'Canvas'}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the selected Grimoire canvas attachment.
          </DialogDescription>
        </DialogHeader>
        <CanvasAttachmentToolbar
          addingImage={addingImage}
          canAddImage={Boolean(vaultPath)}
          color={color}
          copyMarkdownDisabled={!hasCanvasContent}
          copyMarkdownState={extractState}
          document={document}
          inkColors={inkColors}
          onAddImage={() => { void handleAddImage() }}
          onCopyMarkdown={() => { void handleCopyMarkdown() }}
          setColor={setColor}
          setDocument={updateDocument}
          setSize={setSize}
          setTextValue={setTextValue}
          setTool={setTool}
          size={size}
          textValue={textValue}
          tool={tool}
        />
        <div className="canvas-attachment__stage">
          {loading ? (
            <div className="canvas-attachment__loading"><Loader2 className="size-4 animate-spin" /></div>
          ) : (
            <CanvasDrawingSurface
              color={color}
              document={document}
              setDocument={updateDocument}
              size={size}
              textValue={textValue}
              tool={tool}
              vaultPath={vaultPath}
            />
          )}
        </div>
        <DialogFooter>
          <div className="canvas-attachment__status" role="status">
            {statusCopy}
          </div>
          <Button disabled={saveDisabled} onClick={handleSave} type="button">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

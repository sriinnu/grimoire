import { useCallback, useEffect, useState } from 'react'
import {
  Eraser,
  Hand,
  Highlighter,
  Loader2,
  PenLine,
  Save,
  Trash2,
  Undo2,
} from 'lucide-react'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CanvasAttachment, CanvasDocument } from '../../utils/canvasAttachments'
import { createCanvasDocument } from '../../utils/canvasAttachments'
import { CANVAS_COLORS, CANVAS_SIZES } from './canvasDrawing'
import { CanvasDrawingSurface, type CanvasTool } from './CanvasDrawingSurface'
import { loadCanvasDocument, saveCanvasDocument } from './canvasPersistence'
import './CanvasAttachment.css'

interface CanvasAttachmentDialogProps {
  attachment: CanvasAttachment | null
  onOpenChange: (open: boolean) => void
  open: boolean
  vaultPath?: string
}

const TOOLS: Array<{ id: CanvasTool; label: string; icon: typeof PenLine }> = [
  { id: 'pen', label: 'Pen', icon: PenLine },
  { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'hand', label: 'Hand', icon: Hand },
]

function ToolButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean
  icon: typeof PenLine
  label: string
  onClick: () => void
}) {
  return (
    <ActionTooltip copy={{ label }}>
      <Button
        aria-label={label}
        aria-pressed={active}
        className="canvas-attachment__icon-button"
        onClick={onClick}
        size="icon-sm"
        type="button"
        variant={active ? 'default' : 'outline'}
      >
        <Icon />
      </Button>
    </ActionTooltip>
  )
}

function ColorButton({
  active,
  color,
  onClick,
}: {
  active: boolean
  color: string
  onClick: () => void
}) {
  return (
    <Button
      aria-label={`Ink ${color}`}
      aria-pressed={active}
      className="canvas-attachment__color"
      onClick={onClick}
      size="icon-xs"
      style={{ backgroundColor: color }}
      type="button"
      variant={active ? 'default' : 'outline'}
    />
  )
}

function SizeButton({ active, size, onClick }: { active: boolean; size: number; onClick: () => void }) {
  return (
    <Button
      aria-label={`${size}px ink`}
      aria-pressed={active}
      className="canvas-attachment__size"
      onClick={onClick}
      size="icon-sm"
      type="button"
      variant={active ? 'default' : 'outline'}
    >
      <span style={{ width: size + 4, height: size + 4 }} />
    </Button>
  )
}

function CanvasToolbar({
  color,
  setColor,
  setDocument,
  setSize,
  setTool,
  size,
  tool,
}: {
  color: string
  setColor: (color: string) => void
  setDocument: (updater: (document: CanvasDocument) => CanvasDocument) => void
  setSize: (size: number) => void
  setTool: (tool: CanvasTool) => void
  size: number
  tool: CanvasTool
}) {
  return (
    <div className="canvas-attachment__toolbar">
      <div className="canvas-attachment__tool-group">
        {TOOLS.map((item) => (
          <ToolButton
            key={item.id}
            active={tool === item.id}
            icon={item.icon}
            label={item.label}
            onClick={() => setTool(item.id)}
          />
        ))}
      </div>
      <div className="canvas-attachment__tool-group">
        {CANVAS_COLORS.map((swatch) => (
          <ColorButton key={swatch} active={color === swatch} color={swatch} onClick={() => setColor(swatch)} />
        ))}
      </div>
      <div className="canvas-attachment__tool-group">
        {CANVAS_SIZES.map((option) => (
          <SizeButton key={option} active={size === option} size={option} onClick={() => setSize(option)} />
        ))}
      </div>
      <div className="canvas-attachment__tool-group canvas-attachment__tool-group--end">
        <ToolButton
          active={false}
          icon={Undo2}
          label="Undo"
          onClick={() => setDocument((current) => ({ ...current, strokes: current.strokes.slice(0, -1) }))}
        />
        <ToolButton
          active={false}
          icon={Trash2}
          label="Clear"
          onClick={() => setDocument((current) => ({ ...current, strokes: [] }))}
        />
      </div>
    </div>
  )
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
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !attachment) return
    setLoading(true)
    const fallback = createCanvasDocument(attachment.kind)
    if (!vaultPath) {
      setDocument(fallback)
      setLoading(false)
      return
    }
    void loadCanvasDocument(vaultPath, attachment).then(setDocument).finally(() => setLoading(false))
  }, [attachment, open, vaultPath])

  const handleSave = useCallback(async () => {
    if (!attachment || !vaultPath) return
    setSaving(true)
    try {
      await saveCanvasDocument(vaultPath, attachment, document)
    } finally {
      setSaving(false)
    }
  }, [attachment, document, vaultPath])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="canvas-attachment__dialog" showCloseButton>
        <DialogHeader>
          <DialogTitle>{attachment?.title ?? 'Canvas'}</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the selected Grimoire canvas attachment.
          </DialogDescription>
        </DialogHeader>
        <CanvasToolbar
          color={color}
          setColor={setColor}
          setDocument={setDocument}
          setSize={setSize}
          setTool={setTool}
          size={size}
          tool={tool}
        />
        <div className="canvas-attachment__stage">
          {loading ? (
            <div className="canvas-attachment__loading"><Loader2 className="size-4 animate-spin" /></div>
          ) : (
            <CanvasDrawingSurface
              color={color}
              document={document}
              setDocument={setDocument}
              size={size}
              tool={tool}
            />
          )}
        </div>
        <DialogFooter>
          <Button disabled={!vaultPath || saving} onClick={handleSave} type="button">
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

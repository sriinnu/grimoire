import {
  Circle,
  Clipboard,
  ClipboardCheck,
  Eraser,
  Hand,
  Highlighter,
  ImagePlus,
  LassoSelect,
  Minus,
  PenLine,
  RectangleHorizontal,
  Trash2,
  Type,
  Undo2,
} from 'lucide-react'
import { ActionTooltip } from '@/components/ui/action-tooltip'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CanvasDocument } from '../../utils/canvasAttachments'
import { CANVAS_SIZES, clearCanvasDocument, undoCanvasDocument } from './canvasDrawing'
import type { CanvasTool } from './CanvasDrawingSurface'

const TOOLS: Array<{ id: CanvasTool; label: string; icon: typeof PenLine }> = [
  { id: 'pen', label: 'Pen', icon: PenLine },
  { id: 'highlighter', label: 'Highlighter', icon: Highlighter },
  { id: 'rectangle', label: 'Rectangle', icon: RectangleHorizontal },
  { id: 'ellipse', label: 'Ellipse', icon: Circle },
  { id: 'line', label: 'Line', icon: Minus },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'lasso', label: 'Lasso', icon: LassoSelect },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'hand', label: 'Hand', icon: Hand },
]

function ToolButton({
  active,
  icon: Icon,
  label,
  onClick,
  disabled = false,
}: {
  active: boolean
  disabled?: boolean
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
        disabled={disabled}
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

interface CanvasAttachmentToolbarProps {
  addingImage: boolean
  canAddImage: boolean
  color: string
  copyMarkdownDisabled: boolean
  copyMarkdownState: 'idle' | 'copied' | 'failed'
  document: CanvasDocument
  inkColors: readonly string[]
  onAddImage: () => void
  onCopyMarkdown: () => void
  setColor: (color: string) => void
  setDocument: (updater: (document: CanvasDocument) => CanvasDocument) => void
  setSize: (size: number) => void
  setTextValue: (value: string) => void
  setTool: (tool: CanvasTool) => void
  size: number
  textValue: string
  tool: CanvasTool
}

/** Toolbar for the local Markdown-backed canvas editor. */
export function CanvasAttachmentToolbar({
  addingImage,
  canAddImage,
  color,
  copyMarkdownDisabled,
  copyMarkdownState,
  document,
  inkColors,
  onAddImage,
  onCopyMarkdown,
  setColor,
  setDocument,
  setSize,
  setTextValue,
  setTool,
  size,
  textValue,
  tool,
}: CanvasAttachmentToolbarProps) {
  const hasContent = document.strokes.length > 0
    || document.images.length > 0
    || document.shapes.length > 0
    || document.textBoxes.length > 0

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
        {inkColors.map((swatch) => (
          <ColorButton key={swatch} active={color === swatch} color={swatch} onClick={() => setColor(swatch)} />
        ))}
      </div>
      <div className="canvas-attachment__tool-group">
        {CANVAS_SIZES.map((option) => (
          <SizeButton key={option} active={size === option} size={option} onClick={() => setSize(option)} />
        ))}
      </div>
      <div className="canvas-attachment__tool-group canvas-attachment__text-tool">
        <Input
          aria-label="Canvas text"
          onChange={(event) => setTextValue(event.target.value)}
          placeholder="Text"
          value={textValue}
        />
      </div>
      <div className="canvas-attachment__tool-group canvas-attachment__tool-group--end">
        <ToolButton
          active={false}
          disabled={!canAddImage || addingImage}
          icon={ImagePlus}
          label={addingImage ? 'Adding image' : 'Add Image'}
          onClick={onAddImage}
        />
        <ToolButton
          active={copyMarkdownState === 'copied'}
          disabled={copyMarkdownDisabled}
          icon={copyMarkdownState === 'copied' ? ClipboardCheck : Clipboard}
          label={copyMarkdownState === 'failed' ? 'Retry Copy Markdown' : 'Copy Markdown'}
          onClick={onCopyMarkdown}
        />
        <ToolButton
          active={false}
          disabled={!hasContent}
          icon={Undo2}
          label="Undo"
          onClick={() => setDocument(undoCanvasDocument)}
        />
        <ToolButton
          active={false}
          disabled={!hasContent}
          icon={Trash2}
          label="Clear"
          onClick={() => setDocument(clearCanvasDocument)}
        />
      </div>
    </div>
  )
}

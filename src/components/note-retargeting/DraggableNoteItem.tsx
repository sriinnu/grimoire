import type { DragEvent, ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { clearDraggedNotePath, writeDraggedNotePath } from './noteDragData'

interface DraggableNoteItemProps {
  notePath: string
  noteTitle?: string
  children: ReactNode
}

/**
 * Wraps a note item with HTML5 drag-and-drop support.
 *
 * On drag start, a custom drag preview card is rendered via `setDragImage()`
 * so the user sees a styled chip showing the note title + path instead of the
 * browser's default ghosted-element clone. This matches Finder / Bear / Notes
 * drag behaviour on macOS.
 */
export function DraggableNoteItem({ notePath, noteTitle, children }: DraggableNoteItemProps) {
  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    writeDraggedNotePath(event, notePath)
    event.dataTransfer.effectAllowed = 'link'

    // Build a lightweight drag preview chip so the drag ghost reads like a
    // Finder item, not a pixel-clone of the full note row.
    const container = document.createElement('div')
    container.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;pointer-events:none;z-index:-1;'
    document.body.appendChild(container)

    const root = createRoot(container)
    root.render(
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 10px',
          borderRadius: 7,
          background: 'var(--surface-card, #fff)',
          border: '1px solid color-mix(in srgb, var(--primary) 30%, var(--border-default))',
          boxShadow: '0 8px 24px color-mix(in srgb, var(--primary) 16%, transparent)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--foreground, #000)',
          whiteSpace: 'nowrap',
          maxWidth: 200,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        <span style={{ flexShrink: 0, fontSize: 14 }}>📄</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {noteTitle ?? notePath.split('/').pop() ?? notePath}
        </span>
      </div>,
    )

    // Let the browser measure the rendered chip before capturing it.
    requestAnimationFrame(() => {
      event.dataTransfer.setDragImage(container, 12, 12)
      // Clean up after the browser has captured the image.
      requestAnimationFrame(() => {
        root.unmount()
        container.remove()
      })
    })
  }

  const handleDragEnd = () => {
    clearDraggedNotePath()
  }

  return (
    <div
      draggable
      data-testid={`draggable-note:${notePath}`}
      className="cursor-grab active:cursor-grabbing"
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {children}
    </div>
  )
}

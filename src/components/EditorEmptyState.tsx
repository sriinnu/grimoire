import './EditorEmptyState.css'
import { useDragRegion } from '../hooks/useDragRegion'
import { formatShortcutDisplay } from '../hooks/appCommandCatalog'

/**
 * Decorative idle state for the editor pane. Shows a quill-and-inkwell
 * illustration that adapts to the active theme via CSS custom properties.
 */
export function EditorEmptyState() {
  const breadcrumbBarHeight = 52
  const { onMouseDown } = useDragRegion()
  const quickOpenShortcut = formatShortcutDisplay({ display: '⌘P / ⌘O' })
  const newNoteShortcut = formatShortcutDisplay({ display: '⌘N' })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        data-tauri-drag-region
        data-testid="editor-empty-state-drag-region"
        className="shrink-0"
        onMouseDown={onMouseDown}
        style={{ height: breadcrumbBarHeight }}
      />
      <div
        aria-live="polite"
        className="editor-empty-state"
        data-testid="editor-empty-state"
        role="status"
      >
        {/* Quill illustration — 200×200 viewBox, theme-tinted via currentColor / CSS vars */}
        <svg
          aria-hidden="true"
          className="editor-empty-state__mark"
          viewBox="0 0 200 200"
          fill="none"
        >
          {/* Orbit rings — subtle decorative arcs */}
          <ellipse className="editor-empty-state__orbit" cx="100" cy="112" rx="82" ry="28" />
          <ellipse className="editor-empty-state__orbit editor-empty-state__orbit--inner" cx="100" cy="112" rx="64" ry="22" />

          {/* Inkwell body */}
          <path
            d="M81 148c-2-8 0-18 5-26l7-18c1-3 4-4 7-4s6 1 7 4l7 18c5 8 7 18 5 26"
            stroke="var(--ee-quill-spine)"
            strokeWidth="1.8"
            fill="color-mix(in srgb, var(--foreground) 8%, transparent)"
            strokeLinejoin="round"
          />
          {/* Inkwell rim */}
          <ellipse cx="100" cy="100" rx="19" ry="5" stroke="var(--ee-quill-spine)" strokeWidth="1.8" fill="none" />
          {/* Ink pool */}
          <ellipse cx="100" cy="100" rx="13" ry="3.2" fill="var(--ee-ink)" opacity="0.72" />

          {/* Quill feather — main shape */}
          <path
            d="M100 95 C96 78 87 54 75 32 C70 22 59 14 49 18 C59 28 70 44 76 59 C82 75 85 88 86 95"
            fill="color-mix(in srgb, var(--foreground) 12%, transparent)"
            stroke="var(--ee-quill-body)"
            strokeWidth="1.2"
            strokeLinejoin="round"
            className="editor-empty-state__barb"
          />
          <path
            d="M100 95 C104 78 113 54 125 32 C130 22 141 14 151 18 C141 28 130 44 124 59 C118 75 115 88 114 95"
            fill="color-mix(in srgb, var(--foreground) 12%, transparent)"
            stroke="var(--ee-quill-body)"
            strokeWidth="1.2"
            strokeLinejoin="round"
            className="editor-empty-state__barb"
          />

          {/* Quill spine / rachis */}
          <path
            d="M100 95 C100 82 100 64 100 23"
            stroke="var(--ee-quill-spine)"
            strokeWidth="2.4"
            strokeLinecap="round"
            className="editor-empty-state__spine"
          />

          {/* Quill nib */}
          <path
            d="M100 95 L96 111 L100 118 L104 111 Z"
            className="editor-empty-state__nib"
            strokeLinejoin="round"
          />
          {/* Nib slit */}
          <line
            x1="100" y1="99"
            x2="100" y2="115"
            stroke="color-mix(in srgb, var(--foreground) 38%, transparent)"
            strokeWidth="0.7"
            strokeLinecap="round"
          />

          {/* Ink drop — animated fall from nib */}
          <ellipse
            className="editor-empty-state__drop"
            cx="100" cy="122"
            rx="2.8" ry="3.6"
          />

          {/* Subtle sparkle dots */}
          <circle cx="58" cy="52" r="1.4" fill="var(--ee-accent)" opacity="0.38" />
          <circle cx="144" cy="46" r="1.1" fill="var(--ee-accent)" opacity="0.28" />
          <circle cx="68" cy="62" r="0.9" fill="var(--ee-accent)" opacity="0.22" />
          <circle cx="136" cy="58" r="1.2" fill="var(--ee-accent)" opacity="0.28" />
        </svg>

        <div className="editor-empty-state__copy">
          <div className="editor-empty-state__label">Ready to write</div>
          <div className="editor-empty-state__detail">
            {quickOpenShortcut} to search &middot; {newNoteShortcut} to create
          </div>
        </div>
      </div>
    </div>
  )
}

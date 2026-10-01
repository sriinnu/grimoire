import { useCallback } from 'react'
import { scrollToNoteHeading } from '../../utils/noteNavigation'
import type { OutlineRailItem } from './headingOutlineModel'
import type { HeadingOutlineState } from './useOutlineHeadings'
import { useActiveOutlineHeading } from './useActiveOutlineHeading'
import './HeadingOutline.css'

export interface OutlineCaretEditor {
  setTextCursorPosition: (blockId: string, placement?: 'start' | 'end') => void
  focus: () => void
}

function placeCaretInHeading(editor: OutlineCaretEditor | undefined, target: HTMLElement | null) {
  const blockId = target?.closest<HTMLElement>('[data-id]')?.dataset.id
  if (!editor || !blockId) return
  try {
    editor.setTextCursorPosition(blockId, 'end')
    editor.focus()
  } catch {
    // The block can vanish between render and click; scrolling already happened.
  }
}

function OutlineItem({ item, active, onSelect }: {
  item: OutlineRailItem
  active: boolean
  onSelect: (item: OutlineRailItem) => void
}) {
  return (
    <li>
      <button
        type="button"
        className="heading-outline__item"
        data-level={item.heading.level}
        data-active={active ? 'true' : undefined}
        aria-current={active ? 'location' : undefined}
        style={{ '--heading-outline-indent': item.indent } as React.CSSProperties}
        title={item.heading.text}
        onClick={() => onSelect(item)}
      >
        {item.heading.text}
      </button>
    </li>
  )
}

/** Quiet right-edge "On this page" rail for wide editor canvases. */
export function HeadingOutlineRail({ outline, editor }: {
  outline: Pick<HeadingOutlineState, 'items' | 'headings' | 'scrollRef'>
  editor?: OutlineCaretEditor
}) {
  const { items, headings, scrollRef } = outline
  const [activeKey, setActiveKey] = useActiveOutlineHeading(scrollRef, items, headings)

  const handleSelect = useCallback((item: OutlineRailItem) => {
    const target = scrollToNoteHeading(item.heading, item.index, headings)
    placeCaretInHeading(editor, target)
    setActiveKey(item.key)
  }, [editor, headings, setActiveKey])

  return (
    <nav className="heading-outline" aria-label="On this page">
      <p className="heading-outline__label">On this page</p>
      <ol className="heading-outline__list">
        {items.map((item) => (
          <OutlineItem key={item.key} item={item} active={item.key === activeKey} onSelect={handleSelect} />
        ))}
      </ol>
    </nav>
  )
}

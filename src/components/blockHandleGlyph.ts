import {
  Code,
  GripVertical,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Image,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Sigma,
  Table,
  TextQuote,
  type LucideIcon,
} from 'lucide-react'

/**
 * The block handle shows what the block is, not an anonymous grip: ¶ for a
 * paragraph, H2 for a heading, a bullet for a list item, and so on. Drag it
 * to move the block; click it for the block menu. The grip only appears
 * while dragging.
 */
export type BlockHandleGlyph = { Icon: LucideIcon; label: string }

const GLYPHS: Record<string, BlockHandleGlyph> = {
  paragraph: { Icon: Pilcrow, label: 'Paragraph' },
  bulletListItem: { Icon: List, label: 'Bullet list' },
  numberedListItem: { Icon: ListOrdered, label: 'Numbered list' },
  checkListItem: { Icon: ListChecks, label: 'Checklist' },
  quote: { Icon: TextQuote, label: 'Quote' },
  codeBlock: { Icon: Code, label: 'Code block' },
  table: { Icon: Table, label: 'Table' },
  image: { Icon: Image, label: 'Image' },
  mathBlock: { Icon: Sigma, label: 'Math' },
}

const HEADINGS: Record<number, BlockHandleGlyph> = {
  1: { Icon: Heading1, label: 'Heading 1' },
  2: { Icon: Heading2, label: 'Heading 2' },
  3: { Icon: Heading3, label: 'Heading 3' },
  4: { Icon: Heading4, label: 'Heading 4' },
}

export const FALLBACK_HANDLE_GLYPH: BlockHandleGlyph = { Icon: GripVertical, label: 'Block' }

export function blockHandleGlyph(block: { type: string; props?: Record<string, unknown> } | undefined | null): BlockHandleGlyph {
  if (!block) return FALLBACK_HANDLE_GLYPH
  if (block.type === 'heading') {
    const level = Number(block.props?.level ?? 1)
    return HEADINGS[level] ?? HEADINGS[1]
  }
  return GLYPHS[block.type] ?? FALLBACK_HANDLE_GLYPH
}

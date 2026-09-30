/*
 * Sidebar geometry. Sections are inset 8px from the pane edge; rows pad 8px
 * more, so every row glyph sits at x=16 and, with a 20px glyph box and an 8px
 * gap, every label starts at x=44. Rows are 32px tall (6 + 20 + 6). Tree rows
 * (folders, tags) keep a 20px caret column in front of the glyph.
 */
export const SIDEBAR_SECTION_INSET = '0 8px'
export const SIDEBAR_ROW_RADIUS = 6
export const SIDEBAR_ROW_GAP = 8
export const SIDEBAR_GLYPH_BOX = 20
export const SIDEBAR_TREE_STEP = 20

export const SIDEBAR_ITEM_PADDING = {
  regular: '6px 8px',
  withCount: '6px 8px',
  compact: '4px 8px',
  compactWithCount: '4px 8px',
} as const

export const SIDEBAR_GROUP_HEADER_PADDING = {
  regular: '4px 8px',
  withCount: '4px 8px',
} as const

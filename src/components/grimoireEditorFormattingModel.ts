import {
  blockHasType,
  defaultProps,
  editorHasBlockWithType,
  type DefaultProps,
} from '@blocknote/core'
import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core'
import {
  Bold,
  Code2,
  Italic,
  Strikethrough,
  type LucideIcon,
} from 'lucide-react'
import { getGrimoireBlockTypeSelectItems } from './grimoireEditorFormattingConfig'

export type GrimoireBasicTextStyle = 'bold' | 'italic' | 'strike' | 'code'

export const GRIMOIRE_BASIC_TEXT_STYLE_TOOLTIPS = {
  bold: {
    label: 'Bold',
    mainTooltip: 'Bold (persists in markdown)',
    secondaryTooltip: '**strong**',
  },
  italic: {
    label: 'Italic',
    mainTooltip: 'Italic (persists in markdown)',
    secondaryTooltip: '*emphasis*',
  },
  strike: {
    label: 'Strikethrough',
    mainTooltip: 'Strikethrough (persists in markdown)',
    secondaryTooltip: '~~strike~~',
  },
  code: {
    label: 'Inline code',
    mainTooltip: 'Inline code (persists in markdown)',
    secondaryTooltip: '`code`',
  },
} satisfies Record<
  GrimoireBasicTextStyle,
  { label: string; mainTooltip: string; secondaryTooltip: string }
>

export const GRIMOIRE_BASIC_TEXT_STYLE_ICONS = {
  bold: Bold,
  italic: Italic,
  strike: Strikethrough,
  code: Code2,
} satisfies Record<GrimoireBasicTextStyle, LucideIcon>

export type GrimoireSelectedBlock = ReturnType<
  BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>['getTextCursorPosition']
>['block']

const FORMATTING_TOOLBAR_FILE_BLOCK_TYPES = new Set([
  'audio',
  'file',
  'image',
  'video',
])

export type GrimoireBlockTypeSelectOption = ReturnType<
  typeof getGrimoireBlockTypeSelectItems
>[number] & {
  isSelected: boolean
}

/** Maps the active block text alignment to a floating toolbar placement. */
export function textAlignmentToPlacement(
  textAlignment: DefaultProps['textAlignment'],
) {
  switch (textAlignment) {
    case 'left':
      return 'top-start'
    case 'center':
      return 'top'
    case 'right':
      return 'top-end'
    default:
      return 'top-start'
  }
}

function editorSupportsTextStyle(
  style: GrimoireBasicTextStyle,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  return (
    style in editor.schema.styleSchema &&
    editor.schema.styleSchema[style].type === style &&
    editor.schema.styleSchema[style].propSchema === 'boolean'
  )
}

/** Reads the selected blocks while tolerating transient BlockNote selection churn. */
export function getSelectedBlocksSafely(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
): GrimoireSelectedBlock[] {
  try {
    const selectionBlocks = editor.getSelection()?.blocks
    if (selectionBlocks?.length) {
      return selectionBlocks as GrimoireSelectedBlock[]
    }
  } catch {
    // BlockNote can briefly expose an invalid selection while inline actions remount blocks.
  }

  try {
    return [editor.getTextCursorPosition().block as GrimoireSelectedBlock]
  } catch {
    return []
  }
}

/** Reads the cursor block while tolerating editor remount and selection races. */
export function getCursorBlockSafely(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
): GrimoireSelectedBlock | null {
  try {
    return editor.getTextCursorPosition().block as GrimoireSelectedBlock
  } catch {
    return null
  }
}

function selectionSupportsInlineFormatting(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  return getSelectedBlocksSafely(editor).some((block) => block.content !== undefined)
}

/** Returns text-style button state, or undefined when the current selection cannot support it. */
export function getBasicTextStyleButtonState(
  basicTextStyle: GrimoireBasicTextStyle,
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  if (!editor.isEditable) return undefined
  if (!editorSupportsTextStyle(basicTextStyle, editor)) return undefined
  if (!selectionSupportsInlineFormatting(editor)) return undefined

  return {
    active: basicTextStyle in editor.getActiveStyles(),
  }
}

function isSelectedBlockTypeItem(
  item: ReturnType<typeof getGrimoireBlockTypeSelectItems>[number],
  firstSelectedBlock: GrimoireSelectedBlock,
) {
  if (item.type !== firstSelectedBlock.type) return false

  return Object.entries(item.props || {}).every(
    ([propName, propValue]) =>
      propValue === firstSelectedBlock.props[propName],
  )
}

/** Builds the supported block-type menu options for the active BlockNote schema. */
export function getGrimoireBlockTypeSelectOptions(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
  firstSelectedBlock: GrimoireSelectedBlock,
) {
  return getGrimoireBlockTypeSelectItems()
    .filter((item) =>
      editorHasBlockWithType(
        editor,
        item.type,
        Object.fromEntries(
          Object.entries(item.props || {}).map(([propName, propValue]) => [
            propName,
            typeof propValue,
          ]),
        ) as Record<string, 'string' | 'number' | 'boolean'>,
      ),
    )
    .map((item) => ({
      ...item,
      isSelected: isSelectedBlockTypeItem(item, firstSelectedBlock),
    }))
}

/** Returns a file-block id used to bridge hover between file blocks and the toolbar. */
export function getFormattingToolbarBridgeBlockId(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  const selectedBlock = getSelectedBlocksSafely(editor)[0]
  if (!selectedBlock) return null

  return FORMATTING_TOOLBAR_FILE_BLOCK_TYPES.has(selectedBlock.type)
    ? selectedBlock.id
    : null
}

/** Returns the connected editor anchor used by BlockNote's floating toolbar popover. */
export function getFormattingToolbarAnchorElement(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  const anchor = editor.domElement?.firstElementChild
  return anchor instanceof Element && anchor.isConnected ? anchor : null
}

/** Applies the selected block type to every selected block in one editor transaction. */
export function updateSelectedBlocksToType(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
  selectedBlocks: GrimoireSelectedBlock[],
  item: ReturnType<typeof getGrimoireBlockTypeSelectItems>[number],
) {
  editor.focus()
  editor.transact(() => {
    for (const block of selectedBlocks) {
      editor.updateBlock(block, {
        type: item.type as never,
        props: item.props as never,
      })
    }
  })
}

/** Returns the toolbar placement for the current cursor block. */
export function getCurrentToolbarPlacement(
  editor: BlockNoteEditor<BlockSchema, InlineContentSchema, StyleSchema>,
) {
  const block = getCursorBlockSafely(editor)
  if (!block) return 'top-start'

  if (!blockHasType(block, editor, block.type, {
    textAlignment: defaultProps.textAlignment,
  })) {
    return 'top-start'
  }

  return textAlignmentToPlacement(block.props.textAlignment)
}

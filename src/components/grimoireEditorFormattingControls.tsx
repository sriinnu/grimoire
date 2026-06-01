import {
  FormattingToolbar,
  getFormattingToolbarItems,
  useBlockNoteEditor,
  useComponentsContext,
  useEditorState,
} from '@blocknote/react'
import type {
  BlockSchema,
  InlineContentSchema,
  StyleSchema,
} from '@blocknote/core'
import {
  Button as MantineButton,
  CheckIcon as MantineCheckIcon,
  Menu as MantineMenu,
} from '@mantine/core'
import { ChevronDown } from 'lucide-react'
import { useCallback, useMemo, type ReactElement } from 'react'
import {
  GRIMOIRE_BASIC_TEXT_STYLE_ICONS,
  GRIMOIRE_BASIC_TEXT_STYLE_TOOLTIPS,
  getBasicTextStyleButtonState,
  getGrimoireBlockTypeSelectOptions,
  getSelectedBlocksSafely,
  updateSelectedBlocksToType,
  type GrimoireBasicTextStyle,
  type GrimoireBlockTypeSelectOption,
  type GrimoireSelectedBlock,
} from './grimoireEditorFormattingModel'
import {
  filterGrimoireFormattingToolbarItems,
} from './grimoireEditorFormattingConfig'

function GrimoireBasicTextStyleButton({
  basicTextStyle,
}: {
  basicTextStyle: GrimoireBasicTextStyle
}) {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >()
  const buttonState = useEditorState({
    editor,
    selector: ({ editor }) => getBasicTextStyleButtonState(basicTextStyle, editor),
  })

  const toggleStyle = useCallback(() => {
    editor.focus()
    editor.toggleStyles({ [basicTextStyle]: true } as never)
  }, [basicTextStyle, editor])

  if (buttonState === undefined) return null

  const Icon = GRIMOIRE_BASIC_TEXT_STYLE_ICONS[basicTextStyle]
  const copy = GRIMOIRE_BASIC_TEXT_STYLE_TOOLTIPS[basicTextStyle]

  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      data-test={basicTextStyle}
      onClick={toggleStyle}
      isSelected={buttonState.active}
      label={copy.label}
      mainTooltip={copy.mainTooltip}
      secondaryTooltip={copy.secondaryTooltip}
      icon={<Icon />}
    />
  )
}

function getBlockTypeItemIconElement(item: GrimoireBlockTypeSelectOption) {
  const Icon = item.icon
  return <Icon size={16} />
}

function GrimoireBlockTypeSelect() {
  const editor = useBlockNoteEditor<
    BlockSchema,
    InlineContentSchema,
    StyleSchema
  >()
  const selectedBlocks = useEditorState({
    editor,
    selector: ({ editor }): GrimoireSelectedBlock[] => getSelectedBlocksSafely(editor),
  })
  const firstSelectedBlock = selectedBlocks[0] ?? null
  const selectItems = useMemo(
    () => (
      firstSelectedBlock
        ? getGrimoireBlockTypeSelectOptions(editor, firstSelectedBlock)
        : []
    ),
    [editor, firstSelectedBlock],
  )
  const selectedItem = selectItems.find(
    (item): item is GrimoireBlockTypeSelectOption => item.isSelected,
  )

  if (!selectedItem || !editor.isEditable) return null

  return (
    <MantineMenu
      withinPortal={false}
      transitionProps={{ exitDuration: 0 }}
      middlewares={{ flip: true, shift: true, inline: false, size: true }}
    >
      <MantineMenu.Target>
        <MantineButton
          onMouseDown={(event) => {
            event.preventDefault()
            event.currentTarget.focus()
          }}
          leftSection={getBlockTypeItemIconElement(selectedItem)}
          rightSection={<ChevronDown size={16} />}
          size="xs"
          variant="subtle"
        >
          {selectedItem.name}
        </MantineButton>
      </MantineMenu.Target>
      <MantineMenu.Dropdown className="bn-select">
        {selectItems.map((item) => (
          <MantineMenu.Item
            key={item.name}
            onClick={() => {
              updateSelectedBlocksToType(editor, selectedBlocks, item)
            }}
            leftSection={getBlockTypeItemIconElement(item)}
            rightSection={item.isSelected
              ? <MantineCheckIcon size={10} className="bn-tick-icon" />
              : <div className="bn-tick-space" />}
          >
            {item.name}
          </MantineMenu.Item>
        ))}
      </MantineMenu.Dropdown>
    </MantineMenu>
  )
}

function replaceToolbarControls(items: ReactElement[]) {
  return items.flatMap((item) => {
    switch (String(item.key)) {
      case 'blockTypeSelect':
        return [<GrimoireBlockTypeSelect key={item.key} />]
      case 'boldStyleButton':
        return [<GrimoireBasicTextStyleButton basicTextStyle="bold" key={item.key} />]
      case 'italicStyleButton':
        return [<GrimoireBasicTextStyleButton basicTextStyle="italic" key={item.key} />]
      case 'strikeStyleButton':
        return [<GrimoireBasicTextStyleButton basicTextStyle="strike" key={item.key} />]
      default:
        return [item]
    }
  })
}

function insertInlineCodeButton(items: ReactElement[]) {
  const strikeButtonIndex = items.findIndex(
    (item) => String(item.key) === 'strikeStyleButton',
  )
  if (strikeButtonIndex === -1) return items

  return [
    ...items.slice(0, strikeButtonIndex + 1),
    <GrimoireBasicTextStyleButton basicTextStyle="code" key="codeStyleButton" />,
    ...items.slice(strikeButtonIndex + 1),
  ]
}

function getGrimoireFormattingToolbarItems() {
  return insertInlineCodeButton(
    replaceToolbarControls(
      filterGrimoireFormattingToolbarItems(
        getFormattingToolbarItems(),
      ),
    ),
  )
}

/** Renders the Grimoire-flavored BlockNote formatting toolbar controls. */
export function GrimoireFormattingToolbar() {
  return <FormattingToolbar>{getGrimoireFormattingToolbarItems()}</FormattingToolbar>
}

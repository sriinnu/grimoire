import { filterSuggestionItems } from '@blocknote/core/extensions'
import { getDefaultReactSlashMenuItems } from '@blocknote/react'
import type { ReactElement } from 'react'
import {
  Code2,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  List,
  ListChecks,
  ListOrdered,
  Pilcrow,
  Quote,
  type LucideIcon,
} from 'lucide-react'
import {
  getGrimoireCustomSlashMenuItems,
  type GrimoireSlashMenuItem,
} from './grimoireSlashCommandItems'

type GrimoireSlashMenuSourceEditor = Parameters<typeof getDefaultReactSlashMenuItems>[0]
type GrimoireBlockTypeSelectItem = {
  name: string
  type: string
  props?: Record<string, boolean | number | string>
  icon: LucideIcon
}

const UNSUPPORTED_FORMATTING_TOOLBAR_KEYS = new Set([
  'underlineStyleButton',
  'textAlignLeftButton',
  'textAlignCenterButton',
  'textAlignRightButton',
  'colorStyleButton',
])

const UNSUPPORTED_SLASH_MENU_KEYS = new Set([
  'toggle_heading',
  'toggle_heading_2',
  'toggle_heading_3',
  'toggle_list',
])
const MAX_SEARCH_RESULTS_PER_GROUP = 5

const GRIMOIRE_BLOCK_TYPE_SELECT_ITEMS: GrimoireBlockTypeSelectItem[] = [
  { name: 'Paragraph', type: 'paragraph', icon: Pilcrow },
  { name: 'Heading 1', type: 'heading', props: { level: 1 }, icon: Heading1 },
  { name: 'Heading 2', type: 'heading', props: { level: 2 }, icon: Heading2 },
  { name: 'Heading 3', type: 'heading', props: { level: 3 }, icon: Heading3 },
  { name: 'Heading 4', type: 'heading', props: { level: 4 }, icon: Heading4 },
  { name: 'Heading 5', type: 'heading', props: { level: 5 }, icon: Heading5 },
  { name: 'Heading 6', type: 'heading', props: { level: 6 }, icon: Heading6 },
  { name: 'Quote', type: 'quote', icon: Quote },
  { name: 'Bullet List', type: 'bulletListItem', icon: List },
  { name: 'Numbered List', type: 'numberedListItem', icon: ListOrdered },
  { name: 'Checklist', type: 'checkListItem', icon: ListChecks },
  { name: 'Code Block', type: 'codeBlock', icon: Code2 },
]

const GRIMOIRE_SLASH_MENU_SUPPORT_SUBTEXT: Partial<Record<string, string>> = {
  heading: 'Heading 1 (`#`): page title or major top-level section.',
  heading_2: 'Heading 2 (`##`): main section inside the note.',
  heading_3: 'Heading 3 (`###`): subsection under a Heading 2.',
  heading_4: 'Heading 4 (`####`): nested detail section.',
  heading_5: 'Heading 5 (`#####`): deep outline level.',
  heading_6: 'Heading 6 (`######`): smallest markdown heading.',
  quote: 'Markdown-safe block quote (`>`). Persists after save and note switches.',
  bullet_list: 'Markdown-safe bullet list (`-`). Persists after save and note switches.',
  numbered_list: 'Markdown-safe numbered list (`1.`). Persists after save and note switches.',
  check_list: 'Markdown-safe checklist (`- [ ]`). Persists after save and note switches.',
  paragraph: 'Plain markdown paragraph text. Persists after save and note switches.',
  code_block: 'Markdown-safe fenced code block (```...```). Persists after save and note switches.',
  divider: 'Markdown horizontal rule. Good for separating sections without leaving markdown.',
  table: 'Markdown table. Use for compact comparisons, plans, and structured notes.',
  image: 'Vault attachment image block. Keeps media beside your notes.',
  video: 'Vault attachment video block. Keeps media beside your notes.',
  audio: 'Vault attachment audio block. Keeps recordings beside your notes.',
  file: 'Vault attachment file block. Keeps source material beside your notes.',
  emoji: 'Insert emoji without leaving the editor.',
}

const GRIMOIRE_SLASH_MENU_METADATA: Partial<Record<string, {
  title?: string
  aliases: string[]
  group: string
}>> = {
  heading: { title: 'Heading 1', aliases: ['#', 'h1', 'title', 'page title', 'big heading'], group: 'Structure' },
  heading_2: { title: 'Heading 2', aliases: ['##', 'h2', 'section', 'main section'], group: 'Structure' },
  heading_3: { title: 'Heading 3', aliases: ['###', 'h3', 'subsection'], group: 'Structure' },
  heading_4: { title: 'Heading 4', aliases: ['####', 'h4', 'nested section'], group: 'Structure' },
  heading_5: { title: 'Heading 5', aliases: ['#####', 'h5', 'deep section'], group: 'Structure' },
  heading_6: { title: 'Heading 6', aliases: ['######', 'h6', 'small heading'], group: 'Structure' },
  paragraph: { aliases: ['text', 'body', 'plain'], group: 'Structure' },
  quote: { aliases: ['blockquote', 'cite'], group: 'Structure' },
  code_block: { aliases: ['code', 'fence', 'snippet'], group: 'Structure' },
  divider: { aliases: ['rule', 'hr', 'line', 'separator'], group: 'Structure' },
  bullet_list: { aliases: ['ul', 'unordered', 'dash list'], group: 'Lists' },
  numbered_list: { aliases: ['ol', 'ordered', 'number list'], group: 'Lists' },
  check_list: { aliases: ['todo', 'task', 'checkbox'], group: 'Lists' },
  table: { aliases: ['grid', 'matrix', 'comparison'], group: 'Markdown' },
  image: { aliases: ['photo', 'picture', 'asset'], group: 'Media' },
  video: { aliases: ['movie', 'clip'], group: 'Media' },
  audio: { aliases: ['voice', 'recording', 'sound'], group: 'Media' },
  file: { aliases: ['attachment', 'pdf', 'document'], group: 'Media' },
  emoji: { aliases: ['icon', 'reaction'], group: 'Inline' },
}

/** Returns markdown-safe block types shown in the Grimoire formatting toolbar. */
export function getGrimoireBlockTypeSelectItems() {
  return GRIMOIRE_BLOCK_TYPE_SELECT_ITEMS
}

/** Removes rich-text toolbar controls that do not persist cleanly to markdown. */
export function filterGrimoireFormattingToolbarItems<T extends ReactElement>(
  items: T[],
): T[] {
  return items.filter(
    (item) => !UNSUPPORTED_FORMATTING_TOOLBAR_KEYS.has(String(item.key)),
  )
}

/** Annotates and filters BlockNote slash commands for Grimoire's markdown contract. */
export function filterGrimoireSlashMenuItems<T extends GrimoireSlashMenuItem>(
  items: T[],
): T[] {
  return items
    .filter((item) => !UNSUPPORTED_SLASH_MENU_KEYS.has(item.key))
    .map(withGrimoireSlashMetadata)
}

function withGrimoireSlashMetadata<T extends GrimoireSlashMenuItem>(item: T): T {
  const grimoireSubtext = GRIMOIRE_SLASH_MENU_SUPPORT_SUBTEXT[item.key]
  const metadata = GRIMOIRE_SLASH_MENU_METADATA[item.key]
  if (!grimoireSubtext && !metadata) return item

  return {
    ...item,
    title: metadata?.title ?? item.title,
    subtext: grimoireSubtext ?? item.subtext,
    aliases: [...new Set([...(item.aliases ?? []), ...(metadata?.aliases ?? [])])],
    group: metadata?.group ?? item.group,
  }
}

function capSearchResultsByGroup<T extends GrimoireSlashMenuItem>(
  items: T[],
  query: string,
): T[] {
  if (!query.trim()) return items

  const counts = new Map<string, number>()
  return items.filter((item) => {
    const group = item.group ?? 'Other'
    const nextCount = (counts.get(group) ?? 0) + 1
    counts.set(group, nextCount)
    return nextCount <= MAX_SEARCH_RESULTS_PER_GROUP
  })
}

/** Returns the complete Grimoire slash menu catalog for the rich editor. */
export function getGrimoireSlashMenuItems(
  editor: GrimoireSlashMenuSourceEditor,
  query: string,
) {
  return capSearchResultsByGroup(filterSuggestionItems(
    [
      ...filterGrimoireSlashMenuItems(
        getDefaultReactSlashMenuItems(editor) as GrimoireSlashMenuItem[],
      ),
      ...getGrimoireCustomSlashMenuItems(editor as unknown as Parameters<typeof getGrimoireCustomSlashMenuItems>[0]),
    ],
    query,
  ), query)
}

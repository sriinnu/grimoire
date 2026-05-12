import type { DefaultReactSuggestionItem } from '@blocknote/react'
import { createElement } from 'react'
import {
  AtSign,
  CalendarClock,
  CalendarDays,
  CalendarMinus,
  CalendarPlus,
  CheckSquare,
  CircleAlert,
  Clock,
  FileQuestionMark,
  FileText,
  Hash,
  Info,
  Italic,
  Lightbulb,
  Link,
  ListTodo,
  Paperclip,
  Sigma,
  SquareCode,
  Strikethrough,
  Table2,
  TriangleAlert,
} from 'lucide-react'
import { MATH_BLOCK_TYPE, MATH_INLINE_TYPE } from '../mathTypes'
import {
  buildDateContext,
  calloutMarkdown,
  editorSupportsBlockType,
  editorSupportsInlineType,
  insertBlock,
  insertInline,
  insertMarkdown,
  insertParagraph,
  insertStyledText,
  insertTable,
  type GrimoireDateContext,
  type GrimoireCommandDefinition,
  type GrimoireSlashBlock,
  type GrimoireSlashInline,
  type GrimoireSlashMenuEditor,
} from './grimoireSlashCommandActions'
import { GRIMOIRE_KNOWLEDGE_SLASH_COMMANDS } from './grimoireSlashKnowledgeCommands'
import { GRIMOIRE_JOURNAL_SLASH_COMMANDS } from './grimoireSlashJournalCommands'
import { GRIMOIRE_TEMPLATE_SLASH_COMMANDS } from './grimoireSlashTemplateCommands'
import { GRIMOIRE_MEMORY_SLASH_COMMANDS } from './grimoireSlashMemoryCommands'
import { GRIMOIRE_CANVAS_SLASH_COMMANDS } from './grimoireSlashCanvasCommands'
import { GRIMOIRE_MERMAID_SLASH_COMMANDS } from './grimoireSlashMermaidCommands'
import { GRIMOIRE_SADHANA_SLASH_COMMANDS } from './grimoireSlashSadhanaCommands'

/** BlockNote suggestion item enriched with the stable Grimoire command key. */
export type GrimoireSlashMenuItem = DefaultReactSuggestionItem & { key: string }

/** Returns the Grimoire-owned slash commands that extend BlockNote defaults. */
export function getGrimoireCustomSlashMenuItems(
  editor: GrimoireSlashMenuEditor,
  now = new Date(),
): GrimoireSlashMenuItem[] {
  const context = buildDateContext(now)
  return GRIMOIRE_CUSTOM_COMMANDS.map(command => ({
    key: command.key,
    title: command.title,
    subtext: renderCommandSubtext(command.subtext, context),
    aliases: command.aliases,
    group: command.group,
    icon: createElement(command.icon, { size: 18 }),
    onItemClick: () => command.run(editor, context),
  }))
}

function renderCommandSubtext(subtext: string, context: GrimoireDateContext): string {
  return subtext
    .replaceAll('{today}', context.today)
    .replaceAll('{tomorrow}', context.tomorrow)
    .replaceAll('{yesterday}', context.yesterday)
    .replaceAll('{time}', context.time)
}

function insertWikilinkOrMarkdown(
  editor: GrimoireSlashMenuEditor,
  target: string,
) {
  if (!editorSupportsInlineType(editor, 'wikilink')) {
    insertInline(editor, `[[${target}]] `)
    return
  }

  insertInline(editor, [
    { type: 'wikilink', props: { target } },
    ' ',
  ] as unknown as GrimoireSlashInline)
}

function insertInlineMathOrMarkdown(
  editor: GrimoireSlashMenuEditor,
  latex: string,
) {
  if (!editorSupportsInlineType(editor, MATH_INLINE_TYPE)) {
    insertInline(editor, `$${latex}$ `)
    return
  }

  insertInline(editor, [
    { type: MATH_INLINE_TYPE, props: { latex } },
    ' ',
  ] as unknown as GrimoireSlashInline)
}

function insertDisplayMathOrMarkdown(
  editor: GrimoireSlashMenuEditor,
  latex: string,
) {
  if (!editorSupportsBlockType(editor, MATH_BLOCK_TYPE)) {
    insertMarkdown(editor, `$$\n${latex}\n$$`)
    return
  }

  insertBlock(editor, {
    type: MATH_BLOCK_TYPE,
    props: { latex },
  } as unknown as GrimoireSlashBlock)
}

const GRIMOIRE_CUSTOM_COMMANDS: GrimoireCommandDefinition[] = [
  {
    key: 'grimoire_today',
    title: 'Today',
    subtext: 'Insert {today} as YYYY-MM-DD.',
    aliases: ['date', 'daily', 'journal', 'now', 'today'],
    group: 'Dates',
    icon: CalendarDays,
    run: (editor, context) => insertParagraph(editor, context.today),
  },
  {
    key: 'grimoire_tomorrow',
    title: 'Tomorrow',
    subtext: 'Insert {tomorrow} as YYYY-MM-DD.',
    aliases: ['date', 'plan', 'next day', 'tomorrow'],
    group: 'Dates',
    icon: CalendarPlus,
    run: (editor, context) => insertParagraph(editor, context.tomorrow),
  },
  {
    key: 'grimoire_yesterday',
    title: 'Yesterday',
    subtext: 'Insert {yesterday} as YYYY-MM-DD.',
    aliases: ['date', 'previous day', 'yesterday'],
    group: 'Dates',
    icon: CalendarMinus,
    run: (editor, context) => insertParagraph(editor, context.yesterday),
  },
  {
    key: 'grimoire_time_now',
    title: 'Time Now',
    subtext: 'Insert {time} as the current local time.',
    aliases: ['time', 'clock', 'now', 'timestamp'],
    group: 'Dates',
    icon: Clock,
    run: (editor, context) => insertParagraph(editor, context.time),
  },
  {
    key: 'grimoire_daily_note_link',
    title: 'Daily Note Link',
    subtext: 'Insert a Spelllink for today.',
    aliases: ['daily', 'journal', 'today link', 'date link', 'spelllink'],
    group: 'Dates',
    icon: CalendarClock,
    run: (editor, context) => insertWikilinkOrMarkdown(editor, context.today),
  },
  {
    key: 'grimoire_task_due_today',
    title: 'Task Due Today',
    subtext: 'Create a checklist item with today in the text.',
    aliases: ['todo today', 'task today', 'due today', 'reminder'],
    group: 'Tasks',
    icon: CheckSquare,
    run: (editor, context) => insertBlock(editor, {
      type: 'checkListItem',
      content: `Task due ${context.today}`,
    } as unknown as GrimoireSlashBlock),
  },
  {
    key: 'grimoire_task_due_tomorrow',
    title: 'Task Due Tomorrow',
    subtext: 'Create a checklist item with tomorrow in the text.',
    aliases: ['todo tomorrow', 'task tomorrow', 'due tomorrow', 'follow up'],
    group: 'Tasks',
    icon: ListTodo,
    run: (editor, context) => insertBlock(editor, {
      type: 'checkListItem',
      content: `Task due ${context.tomorrow}`,
    } as unknown as GrimoireSlashBlock),
  },
  {
    key: 'grimoire_note_mention',
    title: 'Note Mention',
    subtext: 'Start the @ picker for notes and people.',
    aliases: ['@', 'mention', 'person', 'note mention', 'mem mention'],
    group: 'Inline',
    icon: AtSign,
    run: editor => insertInline(editor, '@'),
  },
  {
    key: 'grimoire_wikilink',
    title: 'Spelllink',
    subtext: 'Insert a Markdown [[note]] link placeholder.',
    aliases: ['@', 'mention', 'note link', 'backlink', 'internal link', 'wikilink', 'spelllink', '[['],
    group: 'Inline',
    icon: Link,
    run: editor => insertWikilinkOrMarkdown(editor, 'Note Title'),
  },
  {
    key: 'grimoire_tag',
    title: 'Tag / Collection',
    subtext: 'Insert a markdown tag that maps to Mem-style collections.',
    aliases: ['#', 'collection', 'hashtag', 'label', 'nested tag', 'topic'],
    group: 'Inline',
    icon: Hash,
    run: editor => insertInline(editor, '#tag '),
  },
  {
    key: 'grimoire_link',
    title: 'Markdown Link',
    subtext: 'Insert editable link text.',
    aliases: ['url', 'href', 'web link', 'external link'],
    group: 'Inline',
    icon: Link,
    run: editor => insertInline(editor, [
      { type: 'link', href: 'https://example.com', content: 'link text' },
      ' ',
    ]),
  },
  {
    key: 'grimoire_bold_text',
    title: 'Bold Text',
    subtext: 'Insert markdown strong text.',
    aliases: ['strong', '**', 'emphasis'],
    group: 'Inline',
    icon: FileText,
    run: editor => insertStyledText(editor, 'bold text', { bold: true }),
  },
  {
    key: 'grimoire_italic_text',
    title: 'Italic Text',
    subtext: 'Insert markdown emphasis text.',
    aliases: ['italic', 'italics', '_', 'em'],
    group: 'Inline',
    icon: Italic,
    run: editor => insertStyledText(editor, 'italic text', { italic: true }),
  },
  {
    key: 'grimoire_strike_text',
    title: 'Strikethrough',
    subtext: 'Insert markdown deleted text.',
    aliases: ['strike', 'strikethrough', 'delete', '~~'],
    group: 'Inline',
    icon: Strikethrough,
    run: editor => insertStyledText(editor, 'struck text', { strike: true }),
  },
  {
    key: 'grimoire_highlight_text',
    title: 'Highlight Text',
    subtext: 'Insert Obsidian-style highlight markers.',
    aliases: ['highlight', 'mark', '=='],
    group: 'Inline',
    icon: FileText,
    run: editor => insertInline(editor, '==highlighted text== '),
  },
  {
    key: 'grimoire_inline_code',
    title: 'Inline Code',
    subtext: 'Insert inline code text.',
    aliases: ['`', 'code span', 'monospace'],
    group: 'Inline',
    icon: SquareCode,
    run: editor => insertStyledText(editor, 'code', { code: true }),
  },
  {
    key: 'grimoire_simple_table',
    title: 'Simple Table',
    subtext: 'Insert a markdown-friendly 3-column table.',
    aliases: ['table', 'grid', 'columns', 'matrix'],
    group: 'Markdown',
    icon: Table2,
    run: editor => insertTable(editor, ['Name', 'Owner', 'Status'], [['', '', ''], ['', '', '']]),
  },
  {
    key: 'grimoire_comparison_table',
    title: 'Comparison Table',
    subtext: 'Create a compact comparison table.',
    aliases: ['pros cons', 'compare', 'decision table', 'matrix'],
    group: 'Markdown',
    icon: Table2,
    run: editor => insertTable(editor, ['Option', 'Pros', 'Cons'], [['A', '', ''], ['B', '', '']]),
  },
  {
    key: 'grimoire_callout_note',
    title: 'Callout Note',
    subtext: 'Insert a portable blockquote callout.',
    aliases: ['admonition', 'note', 'info', 'blockquote'],
    group: 'Markdown',
    icon: Info,
    run: editor => insertMarkdown(editor, calloutMarkdown('NOTE', 'Write the note here.')),
  },
  {
    key: 'grimoire_callout_tip',
    title: 'Callout Tip',
    subtext: 'Insert a tip callout.',
    aliases: ['tip', 'hint', 'lightbulb'],
    group: 'Markdown',
    icon: Lightbulb,
    run: editor => insertMarkdown(editor, calloutMarkdown('TIP', 'Useful detail.')),
  },
  {
    key: 'grimoire_callout_warning',
    title: 'Callout Warning',
    subtext: 'Insert a warning callout.',
    aliases: ['warning', 'caution', 'alert'],
    group: 'Markdown',
    icon: TriangleAlert,
    run: editor => insertMarkdown(editor, calloutMarkdown('WARNING', 'Risk to watch.')),
  },
  {
    key: 'grimoire_footnote',
    title: 'Footnote',
    subtext: 'Insert a markdown footnote pair.',
    aliases: ['reference', 'citation', 'note ref', '[^1]'],
    group: 'Markdown',
    icon: FileQuestionMark,
    run: editor => insertMarkdown(editor, '[^1]\n\n[^1]: Reference'),
  },
  {
    key: 'grimoire_source_block',
    title: 'Source Block',
    subtext: 'Capture a source with notes.',
    aliases: ['citation', 'reference', 'link preview', 'web clip'],
    group: 'Markdown',
    icon: Paperclip,
    run: editor => insertMarkdown(editor, [
      '> Source: [Title](https://example.com)',
      '>',
      '> Notes:',
      '> - ',
    ].join('\n')),
  },
  {
    key: 'grimoire_inline_math',
    title: 'Inline Math',
    subtext: 'Insert inline LaTeX math.',
    aliases: ['math', 'latex', 'formula', '$'],
    group: 'Technical',
    icon: Sigma,
    run: editor => insertInlineMathOrMarkdown(editor, 'E=mc^2'),
  },
  {
    key: 'grimoire_display_math',
    title: 'Display Math',
    subtext: 'Insert a display LaTeX block.',
    aliases: ['math block', 'latex block', 'equation', '$$'],
    group: 'Technical',
    icon: CircleAlert,
    run: editor => insertDisplayMathOrMarkdown(editor, 'E=mc^2'),
  },
  ...GRIMOIRE_MERMAID_SLASH_COMMANDS,
  ...GRIMOIRE_SADHANA_SLASH_COMMANDS,
  ...GRIMOIRE_JOURNAL_SLASH_COMMANDS,
  ...GRIMOIRE_KNOWLEDGE_SLASH_COMMANDS,
  ...GRIMOIRE_MEMORY_SLASH_COMMANDS,
  ...GRIMOIRE_CANVAS_SLASH_COMMANDS,
  ...GRIMOIRE_TEMPLATE_SLASH_COMMANDS,
]

import type {
  BlockNoteEditor,
  BlockSchema,
  InlineContentSchema,
  PartialBlock,
  PartialInlineContent,
  StyleSchema,
} from '@blocknote/core'
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions'
import type { LucideIcon } from 'lucide-react'

export type GrimoireSlashMenuEditor = BlockNoteEditor<
  BlockSchema,
  InlineContentSchema,
  StyleSchema
>

export type GrimoireSlashBlock = PartialBlock<
  BlockSchema,
  InlineContentSchema,
  StyleSchema
>

export type GrimoireSlashInline = PartialInlineContent<
  InlineContentSchema,
  StyleSchema
>

export interface GrimoireDateContext {
  today: string
  tomorrow: string
  yesterday: string
  time: string
  canvasStamp: string
  weekStart: string
  weekEnd: string
  weekDates: string[]
  monthLabel: string
  monthCalendarRows: string[][]
}

export interface GrimoireCommandDefinition {
  key: string
  title: string
  subtext: string
  aliases: string[]
  group: string
  icon: LucideIcon
  run: (editor: GrimoireSlashMenuEditor, context: GrimoireDateContext) => void
}

function schemaSectionHasType(schema: unknown, section: string, type: string): boolean {
  if (!schema || typeof schema !== 'object') return false
  const record = schema as Record<string, unknown>
  const schemaSection = record[section]
  return Boolean(
    schemaSection &&
    typeof schemaSection === 'object' &&
    type in schemaSection,
  )
}

/** Checks whether the host editor registered a custom block type. */
export function editorSupportsBlockType(editor: GrimoireSlashMenuEditor, type: string): boolean {
  return schemaSectionHasType(editor.schema, 'blockSchema', type)
}

/** Checks whether the host editor registered a custom inline content type. */
export function editorSupportsInlineType(editor: GrimoireSlashMenuEditor, type: string): boolean {
  return schemaSectionHasType(editor.schema, 'inlineContentSchema', type)
}

/** Formats a local ISO date for slash commands without crossing UTC midnight. */
export function formatLocalDate(offsetDays: number, now = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offsetDays)
  return formatDate(date)
}

/** Builds reusable date labels for slash command insertions and templates. */
export function buildDateContext(now: Date): GrimoireDateContext {
  const weekStart = startOfWeek(now)
  const weekEnd = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
  return {
    today: formatLocalDate(0, now),
    tomorrow: formatLocalDate(1, now),
    yesterday: formatLocalDate(-1, now),
    time: formatLocalTime(now),
    canvasStamp: formatAttachmentStamp(now),
    weekStart: formatDate(weekStart),
    weekEnd: formatDate(weekEnd),
    weekDates: Array.from({ length: 7 }, (_, dayOffset) => formatDate(addDays(weekStart, dayOffset))),
    monthLabel: formatMonthLabel(now),
    monthCalendarRows: buildMonthCalendarRows(now),
  }
}

/** Inserts or updates the current slash block with a BlockNote block. */
export function insertBlock(editor: GrimoireSlashMenuEditor, block: GrimoireSlashBlock) {
  insertOrUpdateBlockForSlashMenu(editor, block)
}

/** Parses markdown into durable editor blocks and inserts it at the slash cursor. */
export function insertMarkdown(editor: GrimoireSlashMenuEditor, markdown: string) {
  let parsedBlocks: GrimoireSlashBlock[] = []

  try {
    parsedBlocks = editor.tryParseMarkdownToBlocks(markdown) as GrimoireSlashBlock[]
  } catch {
    parsedBlocks = []
  }

  if (parsedBlocks.length === 0) {
    insertParagraph(editor, markdown)
    return
  }

  const [firstBlock, ...restBlocks] = parsedBlocks
  const insertedBlock = insertOrUpdateBlockForSlashMenu(editor, firstBlock)
  if (restBlocks.length === 0) return

  const insertedRest = editor.insertBlocks(restBlocks, insertedBlock, 'after')
  const lastInserted = insertedRest[insertedRest.length - 1]
  if (lastInserted) {
    editor.setTextCursorPosition(lastInserted, 'end')
  }
}

/** Inserts or updates the slash block as a paragraph. */
export function insertParagraph(editor: GrimoireSlashMenuEditor, content: string) {
  insertBlock(editor, { type: 'paragraph', content } as unknown as GrimoireSlashBlock)
}

/** Inserts inline content and keeps the cursor after the inserted material. */
export function insertInline(editor: GrimoireSlashMenuEditor, content: GrimoireSlashInline) {
  editor.insertInlineContent(content, { updateSelection: true })
}

/** Inserts styled inline text through BlockNote so markdown serialization stays stable. */
export function insertStyledText(
  editor: GrimoireSlashMenuEditor,
  text: string,
  styles: Record<string, boolean>,
) {
  insertInline(editor, [{ type: 'text', text, styles }] as unknown as GrimoireSlashInline)
}

/** Inserts a markdown-compatible table block. */
export function insertTable(
  editor: GrimoireSlashMenuEditor,
  headers: string[],
  rows: string[][],
) {
  insertBlock(editor, {
    type: 'table',
    content: {
      type: 'tableContent',
      headerRows: 1,
      rows: [
        { cells: headers },
        ...rows.map(cells => ({ cells })),
      ],
    },
  } as unknown as GrimoireSlashBlock)
}

/** Inserts a fenced code block with the requested language. */
export function insertCodeBlock(
  editor: GrimoireSlashMenuEditor,
  language: string,
  content: string,
) {
  insertBlock(editor, {
    type: 'codeBlock',
    props: { language },
    content,
  } as unknown as GrimoireSlashBlock)
}

/** Creates a markdown blockquote callout body. */
export function calloutMarkdown(kind: string, body: string) {
  return [`> [!${kind}]`, `> ${body}`].join('\n')
}

/** Creates the dated daily journal template markdown. */
export function dailyJournalTemplate(context: GrimoireDateContext) {
  return [
    `## Daily Journal - ${context.today}`,
    '',
    'Highlights',
    '- ',
    '',
    'Tasks',
    '- [ ] ',
    '',
    'Notes',
    '',
    'Links',
    '- ',
  ].join('\n')
}

/** Creates the meeting notes template markdown. */
export function meetingTemplate(context: GrimoireDateContext) {
  return [
    `## Meeting - ${context.today}`,
    '',
    'Attendees',
    '- ',
    '',
    'Agenda',
    '- ',
    '',
    'Decisions',
    '- ',
    '',
    'Actions',
    '- [ ] Owner - task',
  ].join('\n')
}

/** Creates the decision note template markdown. */
export function decisionTemplate(context: GrimoireDateContext) {
  return [
    `## Decision - ${context.today}`,
    '',
    'Context',
    '',
    'Decision',
    '',
    'Why',
    '- ',
    '',
    'Tradeoffs',
    '- ',
    '',
    'Follow-ups',
    '- [ ] ',
  ].join('\n')
}

/** Creates the week-range planning template markdown. */
export function weeklyPlanTemplate(context: GrimoireDateContext) {
  return [
    `## Weekly Plan - ${context.weekStart} to ${context.weekEnd}`,
    '',
    'Focus',
    '- ',
    '',
    'Must ship',
    '- [ ] ',
    '',
    'Later',
    '- [ ] ',
    '',
    'Review',
    '- ',
  ].join('\n')
}

/** Creates a dated week calendar table. */
export function weekCalendarTemplate(context: GrimoireDateContext) {
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return [
    `## Week Calendar - ${context.weekStart} to ${context.weekEnd}`,
    '',
    '| Day | Date | Focus | Appointments | Done |',
    '| --- | --- | --- | --- | --- |',
    ...weekdays.map((weekday, index) => (
      `| ${weekday} | ${context.weekDates[index]} |  |  |  |`
    )),
    '',
    'Notes',
    '- ',
  ].join('\n')
}

/** Creates a markdown month grid for the current month. */
export function monthCalendarTemplate(context: GrimoireDateContext) {
  return [
    `## Calendar - ${context.monthLabel}`,
    '',
    '| Mon | Tue | Wed | Thu | Fri | Sat | Sun |',
    '| --- | --- | --- | --- | --- | --- | --- |',
    ...context.monthCalendarRows.map(row => `| ${row.join(' | ')} |`),
    '',
    'Important',
    '- ',
  ].join('\n')
}

function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatMonthLabel(date: Date): string {
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date)
}

function formatLocalTime(date: Date): string {
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  return `${hour}:${minute}`
}

function formatAttachmentStamp(date: Date): string {
  const hour = `${date.getHours()}`.padStart(2, '0')
  const minute = `${date.getMinutes()}`.padStart(2, '0')
  const second = `${date.getSeconds()}`.padStart(2, '0')
  return `${formatDate(date)}-${hour}${minute}${second}`
}

function startOfWeek(date: Date): Date {
  const weekday = date.getDay()
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset)
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days)
}

function buildMonthCalendarRows(date: Date): string[][] {
  const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const month = firstOfMonth.getMonth()
  const firstGridDate = startOfWeek(firstOfMonth)
  const rows: string[][] = []

  for (let week = 0; week < 6; week += 1) {
    const row = Array.from({ length: 7 }, (_, day) => {
      const current = addDays(firstGridDate, week * 7 + day)
      return current.getMonth() === month ? `${current.getDate()}` : ''
    })
    if (week > 3 && row.every(cell => cell === '')) break
    rows.push(row)
  }

  return rows
}

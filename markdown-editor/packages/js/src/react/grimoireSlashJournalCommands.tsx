import {
  CalendarSearch,
  ClipboardList,
  History,
  MapPin,
  RefreshCcw,
  SmilePlus,
  Sparkles,
  TableProperties,
} from 'lucide-react'
import {
  insertMarkdown,
  insertParagraph,
  type GrimoireCommandDefinition,
  type GrimoireDateContext,
} from './grimoireSlashCommandActions'

function markdown(lines: string[]) {
  return lines.join('\n')
}

function frontmatterTemplate(context: GrimoireDateContext) {
  return markdown([
    '---',
    'type: Note',
    `date: ${context.today}`,
    'status: draft',
    'tags: []',
    '---',
    '',
  ])
}

function propertyBlockTemplate(context: GrimoireDateContext) {
  return markdown([
    '## Properties',
    '',
    '| Property | Value |',
    '| --- | --- |',
    '| Type | Note |',
    `| Date | ${context.today} |`,
    '| Status | Draft |',
    '| Links | [[Note Title]] |',
  ])
}

function moodLogTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Check-in - ${context.today} ${context.time}`,
    '',
    'Mood',
    '- ',
    '',
    'Energy',
    '- ',
    '',
    'Location',
    '- ',
    '',
    'What changed',
    '- ',
  ])
}

function weeklyReviewTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Weekly Review - ${context.weekStart} to ${context.weekEnd}`,
    '',
    'Wins',
    '- ',
    '',
    'Shipped',
    '- [ ] ',
    '',
    'Stuck',
    '- ',
    '',
    'People / projects',
    '- [[Project]]',
    '',
    'Next week',
    '- [ ] ',
  ])
}

function monthlyReviewTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Monthly Review - ${context.monthLabel}`,
    '',
    'Theme',
    '- ',
    '',
    'Highlights',
    '- ',
    '',
    'Decisions',
    '- [[Decision]]',
    '',
    'Lessons',
    '- ',
    '',
    'Carry forward',
    '- [ ] ',
  ])
}

function taskRolloverTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Task Rollover - ${context.today}`,
    '',
    'From yesterday',
    '- [ ] ',
    '',
    'Due today',
    '- [ ] ',
    '',
    'Move forward',
    '- [ ] ',
  ])
}

function timelineEntryTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Timeline Entry - ${context.today} ${context.time}`,
    '',
    'Event',
    '- ',
    '',
    'People',
    '- [[Person]]',
    '',
    'Projects',
    '- [[Project]]',
    '',
    'Why it matters',
    '- ',
  ])
}

function weatherPlaceholderTemplate(context: GrimoireDateContext) {
  return markdown([
    `## Weather - ${context.today}`,
    '',
    '| Time | Condition | Temp | Notes |',
    '| --- | --- | --- | --- |',
    `| ${context.time} |  |  |  |`,
  ])
}

export const GRIMOIRE_JOURNAL_SLASH_COMMANDS: GrimoireCommandDefinition[] = [
  {
    key: 'grimoire_date_placeholder',
    title: 'Picked Date Placeholder',
    subtext: 'Insert YYYY-MM-DD for a date picker flow.',
    aliases: ['pick date', 'picked date', 'calendar date', 'date placeholder'],
    group: 'Journal',
    icon: CalendarSearch,
    run: editor => insertParagraph(editor, 'YYYY-MM-DD'),
  },
  {
    key: 'grimoire_frontmatter_block',
    title: 'Frontmatter Block',
    subtext: 'Insert portable YAML metadata.',
    aliases: ['yaml', 'metadata', 'properties yaml', 'frontmatter field'],
    group: 'Journal',
    icon: TableProperties,
    run: (editor, context) => insertMarkdown(editor, frontmatterTemplate(context)),
  },
  {
    key: 'grimoire_property_block',
    title: 'Property Block',
    subtext: 'Insert visible markdown properties.',
    aliases: ['properties', 'property table', 'metadata table', 'frontmatter'],
    group: 'Journal',
    icon: TableProperties,
    run: (editor, context) => insertMarkdown(editor, propertyBlockTemplate(context)),
  },
  {
    key: 'grimoire_mood_log',
    title: 'Mood / Energy Check-in',
    subtext: 'Capture mood, energy, location, and change.',
    aliases: ['mood', 'energy', 'check in', 'location'],
    group: 'Journal',
    icon: SmilePlus,
    run: (editor, context) => insertMarkdown(editor, moodLogTemplate(context)),
  },
  {
    key: 'grimoire_location',
    title: 'Location',
    subtext: 'Add a location line for journal context.',
    aliases: ['place', 'where', 'city', 'geo'],
    group: 'Journal',
    icon: MapPin,
    run: editor => insertMarkdown(editor, 'Location: '),
  },
  {
    key: 'grimoire_weekly_review',
    title: 'Weekly Review',
    subtext: 'Review wins, stuck points, people, and next week.',
    aliases: ['week review', 'weekly retro', 'review week', 'weekly recap'],
    group: 'Journal',
    icon: ClipboardList,
    run: (editor, context) => insertMarkdown(editor, weeklyReviewTemplate(context)),
  },
  {
    key: 'grimoire_monthly_review',
    title: 'Monthly Review',
    subtext: 'Review highlights, decisions, lessons, and carry-forward work.',
    aliases: ['month review', 'monthly retro', 'review month', 'monthly recap'],
    group: 'Journal',
    icon: Sparkles,
    run: (editor, context) => insertMarkdown(editor, monthlyReviewTemplate(context)),
  },
  {
    key: 'grimoire_task_rollover',
    title: 'Task Rollover',
    subtext: 'Move unfinished work into today.',
    aliases: ['rollover', 'carry forward', 'yesterday tasks', 'task review'],
    group: 'Journal',
    icon: RefreshCcw,
    run: (editor, context) => insertMarkdown(editor, taskRolloverTemplate(context)),
  },
  {
    key: 'grimoire_timeline_entry',
    title: 'Timeline Entry',
    subtext: 'Capture an event with people, projects, and meaning.',
    aliases: ['timeline', 'event', 'history', 'journal event'],
    group: 'Journal',
    icon: History,
    run: (editor, context) => insertMarkdown(editor, timelineEntryTemplate(context)),
  },
  {
    key: 'grimoire_weather_placeholder',
    title: 'Weather Placeholder',
    subtext: 'Add a journal weather row without calling a service.',
    aliases: ['weather', 'forecast', 'temperature', 'journal weather'],
    group: 'Journal',
    icon: Sparkles,
    run: (editor, context) => insertMarkdown(editor, weatherPlaceholderTemplate(context)),
  },
]

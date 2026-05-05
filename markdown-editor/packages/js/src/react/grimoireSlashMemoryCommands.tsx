import { Brain, FileSearch, Network, Sparkles, Stethoscope } from 'lucide-react'
import {
  insertMarkdown,
  type GrimoireCommandDefinition,
  type GrimoireDateContext,
} from './grimoireSlashCommandActions'

function lines(markdownLines: string[]) {
  return markdownLines.join('\n')
}

function recallTemplate(context: GrimoireDateContext) {
  return lines([
    `## Recall - ${context.today}`,
    '',
    'Question',
    '- ',
    '',
    'Chitragupta results',
    '- Source: ',
    '- Summary: ',
    '',
    'Follow-up links',
    '- [[Related Note]]',
  ])
}

function relatedMemoryTemplate(context: GrimoireDateContext) {
  return lines([
    `## Related Context - ${context.today}`,
    '',
    'Nearby notes',
    '- [[Note Title]] - why it matters',
    '',
    'Memory edges',
    '- [[Source]] -> [[Target]] because ',
  ])
}

function crystallizeTemplate(context: GrimoireDateContext) {
  return lines([
    `## Crystallize - ${context.today}`,
    '',
    'What changed',
    '- ',
    '',
    'Durable lesson',
    '- ',
    '',
    'Write-back candidates',
    '- [ ] Update [[Note Title]]',
    '- [ ] Create [[New Concept]]',
  ])
}

function diagnoseTemplate(context: GrimoireDateContext) {
  return lines([
    `## Memory Diagnostics - ${context.today}`,
    '',
    'Stale',
    '- ',
    '',
    'Orphaned',
    '- ',
    '',
    'Contradictions',
    '- ',
  ])
}

export const GRIMOIRE_MEMORY_SLASH_COMMANDS: GrimoireCommandDefinition[] = [
  {
    key: 'grimoire_memory_recall',
    title: 'Recall',
    subtext: 'Ask Chitragupta for source-backed memory recall.',
    aliases: ['recall', 'remember', 'search memory', 'mem.ai', 'chitragupta'],
    group: 'Memory',
    icon: FileSearch,
    run: (editor, context) => insertMarkdown(editor, recallTemplate(context)),
  },
  {
    key: 'grimoire_related_memory',
    title: 'Related Memory',
    subtext: 'Prepare nearby notes and memory edges for this note.',
    aliases: ['related', 'context', 'nearby', 'heads up', 'memory graph'],
    group: 'Memory',
    icon: Network,
    run: (editor, context) => insertMarkdown(editor, relatedMemoryTemplate(context)),
  },
  {
    key: 'grimoire_memory_note',
    title: 'Memory Note',
    subtext: 'Capture a durable memory entry as clean Markdown.',
    aliases: ['memory', 'wiki memory', 'semantic memory', 'remember this'],
    group: 'Memory',
    icon: Brain,
    run: (editor, context) => insertMarkdown(editor, [
      `## Memory - ${context.today}`,
      '',
      'Observation',
      '- ',
      '',
      'Meaning',
      '- ',
      '',
      'Sources',
      '- [[Source Note]]',
    ].join('\n')),
  },
  {
    key: 'grimoire_crystallize_memory',
    title: 'Crystallize',
    subtext: 'Turn working notes into durable wiki lessons.',
    aliases: ['crystallize', 'consolidate', 'lesson', 'write back', 'semantic'],
    group: 'Memory',
    icon: Sparkles,
    run: (editor, context) => insertMarkdown(editor, crystallizeTemplate(context)),
  },
  {
    key: 'grimoire_memory_diagnostics',
    title: 'Memory Diagnostics',
    subtext: 'Prepare stale, orphan, and contradiction checks.',
    aliases: ['diagnose', 'diagnostics', 'lint memory', 'stale', 'contradiction'],
    group: 'Memory',
    icon: Stethoscope,
    run: (editor, context) => insertMarkdown(editor, diagnoseTemplate(context)),
  },
]

import {
  Bot,
  BookMarked,
  Columns3,
  FileSearch,
  GitFork,
  ListTree,
  Network,
  TableProperties,
} from 'lucide-react'
import {
  insertMarkdown,
  type GrimoireCommandDefinition,
  type GrimoireDateContext,
} from './grimoireSlashCommandActions'

function lines(markdownLines: string[]) {
  return markdownLines.join('\n')
}

function mapOfContentTemplate(context: GrimoireDateContext) {
  return lines([
    `## Map of Content - ${context.today}`,
    '',
    'Purpose',
    '- ',
    '',
    'Core notes',
    '- [[Note Title]]',
    '',
    'Learning path',
    '1. [[Start Here]]',
    '2. [[Next Concept]]',
    '',
    'Open questions',
    '- [ ] ',
    '',
    'Edges to create',
    '- [[Source Note]] -> [[Target Note]] because ',
  ])
}

function backlinkReviewTemplate(context: GrimoireDateContext) {
  return lines([
    `## Backlink Review - ${context.today}`,
    '',
    'Inbound links',
    '- [[Note Title]] - context',
    '',
    'Outbound links to add',
    '- [[Related Note]]',
    '',
    'Unlinked mentions',
    '- term -> [[Canonical Note]]',
    '',
    'Orphans to connect',
    '- [[Orphan Note]] -> [[Hub Note]]',
  ])
}

function graphNodeTemplate() {
  return lines([
    '## Node - Concept',
    '',
    'Type: #concept',
    'Status: #seed',
    '',
    'Claim',
    '- ',
    '',
    'Evidence',
    '- ',
    '',
    'Edges',
    '- Parent: [[Parent Note]]',
    '- Supports: [[Supported Note]]',
    '- Contradicts: [[Opposing Note]]',
    '- Example: [[Example Note]]',
  ])
}

function graphEdgesTemplate() {
  return lines([
    '## Link Map',
    '',
    '| From | Relation | To | Why |',
    '| --- | --- | --- | --- |',
    '| [[Source Note]] | supports | [[Target Note]] |  |',
    '| [[Question]] | answered by | [[Answer Note]] |  |',
  ])
}

interface TableOfContentsEntry {
  level: number
  text: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : null
}

function headingLevelFromProps(props: unknown): number | null {
  const record = asRecord(props)
  const level = record?.level
  return typeof level === 'number' && Number.isInteger(level) && level >= 1 && level <= 6
    ? level
    : null
}

function inlineText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) {
    const record = asRecord(content)
    return typeof record?.text === 'string' ? record.text : ''
  }

  return content.map((part) => {
    if (typeof part === 'string') return part
    const record = asRecord(part)
    if (!record) return ''
    if (typeof record.text === 'string') return record.text
    return inlineText(record.content)
  }).join('')
}

function collectHeadingEntries(blocks: readonly unknown[]): TableOfContentsEntry[] {
  const entries: TableOfContentsEntry[] = []

  for (const block of blocks) {
    const record = asRecord(block)
    if (!record) continue

    if (record.type === 'heading') {
      const level = headingLevelFromProps(record.props)
      const text = inlineText(record.content).trim()
      if (level && text && !/^table of contents$/i.test(text)) {
        entries.push({ level, text })
      }
    }

    if (Array.isArray(record.children)) {
      entries.push(...collectHeadingEntries(record.children))
    }
  }

  return entries
}

function slugifyHeading(text: string): string {
  const slug = text
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[`*_~[\]().,!?:;'"<>]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')

  return slug || 'heading'
}

function escapeMarkdownLinkText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\[/g, '\\[').replace(/\]/g, '\\]')
}

function tableOfContentsTemplate(entries: TableOfContentsEntry[]) {
  if (entries.length === 0) {
    return lines([
      '## Table of Contents',
      '',
      '- [Section](#section)',
      '  - [Subsection](#subsection)',
    ])
  }

  const minLevel = Math.min(...entries.map(entry => entry.level))
  const slugCounts = new Map<string, number>()
  return lines([
    '## Table of Contents',
    '',
    ...entries.map((entry) => {
      const baseSlug = slugifyHeading(entry.text)
      const previousCount = slugCounts.get(baseSlug) ?? 0
      slugCounts.set(baseSlug, previousCount + 1)
      const slug = previousCount === 0 ? baseSlug : `${baseSlug}-${previousCount + 1}`
      const indent = '  '.repeat(Math.max(0, entry.level - minLevel))
      return `${indent}- [${escapeMarkdownLinkText(entry.text)}](#${slug})`
    }),
  ])
}

function tableOfContentsFromEditor(editor: Parameters<GrimoireCommandDefinition['run']>[0]) {
  return tableOfContentsTemplate(collectHeadingEntries(editor.document))
}

function databaseTableTemplate() {
  return lines([
    '## Database',
    '',
    '| Name | Status | Owner | Links |',
    '| --- | --- | --- | --- |',
    '| Item | Not started |  | [[Note Title]] |',
    '| Item | In progress |  |  |',
  ])
}

function kanbanTemplate() {
  return lines([
    '## Board',
    '',
    '### Now',
    '- [ ] ',
    '',
    '### Next',
    '- [ ] ',
    '',
    '### Later',
    '- [ ] ',
    '',
    '### Done',
    '- [x] ',
  ])
}

function llmResearchTemplate(context: GrimoireDateContext) {
  return lines([
    `## LLM Research Note - ${context.today}`,
    '',
    'Thesis',
    '- ',
    '',
    'Mechanism',
    '- ',
    '',
    'Examples',
    '- ',
    '',
    'Failure modes',
    '- ',
    '',
    'Experiments',
    '- [ ] Prompt:',
    '- [ ] Expected:',
    '- [ ] Observed:',
    '',
    'Links',
    '- [[Transformers]]',
    '- [[Attention]]',
  ])
}

function promptLabTemplate() {
  return lines([
    '## Prompt Lab',
    '',
    'Goal',
    '- ',
    '',
    'System',
    '```text',
    'You are...',
    '```',
    '',
    'User',
    '```text',
    '',
    '```',
    '',
    'Rubric',
    '- [ ] Correct',
    '- [ ] Grounded',
    '- [ ] Concise',
    '',
    'Result',
    '- ',
  ])
}

export const GRIMOIRE_KNOWLEDGE_SLASH_COMMANDS: GrimoireCommandDefinition[] = [
  {
    key: 'grimoire_map_of_content',
    title: 'Map of Content',
    subtext: 'Create an Obsidian-style hub note.',
    aliases: ['moc', 'index', 'hub', 'wiki', 'obsidian'],
    group: 'Knowledge',
    icon: Network,
    run: (editor, context) => insertMarkdown(editor, mapOfContentTemplate(context)),
  },
  {
    key: 'grimoire_backlink_review',
    title: 'Backlink Review',
    subtext: 'Audit inbound [[links]], unlinked mentions, and orphan notes.',
    aliases: ['backlinks', 'wikilinks', 'spelllinks', 'unlinked mentions', 'orphans', 'graph cleanup', 'obsidian'],
    group: 'Knowledge',
    icon: FileSearch,
    run: (editor, context) => insertMarkdown(editor, backlinkReviewTemplate(context)),
  },
  {
    key: 'grimoire_graph_node',
    title: 'Graph Node',
    subtext: 'Capture an atomic concept with typed edges.',
    aliases: ['node', 'concept', 'atomic note', 'zettel', 'wiki node'],
    group: 'Knowledge',
    icon: GitFork,
    run: editor => insertMarkdown(editor, graphNodeTemplate()),
  },
  {
    key: 'grimoire_table_of_contents',
    title: 'Table of Contents',
    subtext: 'Create a linked outline from the headings in this note.',
    aliases: ['toc', 'table of contents', 'contents', 'outline', '#', '##'],
    group: 'Knowledge',
    icon: ListTree,
    run: editor => insertMarkdown(editor, tableOfContentsFromEditor(editor)),
  },
  {
    key: 'grimoire_link_map',
    title: 'Link Map',
    subtext: 'Map [[note]] relationships as durable markdown.',
    aliases: ['graph', 'edges', 'links', 'wikilinks', 'spelllinks', 'nodes', 'relationship map'],
    group: 'Knowledge',
    icon: ListTree,
    run: editor => insertMarkdown(editor, graphEdgesTemplate()),
  },
  {
    key: 'grimoire_database_table',
    title: 'Database Table',
    subtext: 'Notion-style properties as a markdown table.',
    aliases: ['database', 'db', 'notion', 'properties', 'table view'],
    group: 'Knowledge',
    icon: TableProperties,
    run: editor => insertMarkdown(editor, databaseTableTemplate()),
  },
  {
    key: 'grimoire_kanban_board',
    title: 'Kanban Board',
    subtext: 'Notion-style board sections using portable tasks.',
    aliases: ['board', 'kanban', 'notion', 'status', 'workflow'],
    group: 'Knowledge',
    icon: Columns3,
    run: editor => insertMarkdown(editor, kanbanTemplate()),
  },
  {
    key: 'grimoire_llm_research_note',
    title: 'LLM Research Note',
    subtext: 'Karpathy-style mechanism, examples, and experiments.',
    aliases: ['llm', 'karpathy', 'research', 'paper', 'wiki'],
    group: 'Knowledge',
    icon: BookMarked,
    run: (editor, context) => insertMarkdown(editor, llmResearchTemplate(context)),
  },
  {
    key: 'grimoire_prompt_lab',
    title: 'Prompt Lab',
    subtext: 'Capture prompt experiments with a rubric.',
    aliases: ['prompt', 'eval', 'experiment', 'llm', 'ai lab'],
    group: 'Knowledge',
    icon: Bot,
    run: editor => insertMarkdown(editor, promptLabTemplate()),
  },
]

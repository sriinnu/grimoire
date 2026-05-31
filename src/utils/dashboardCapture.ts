import type { VaultEntry } from '../types'
import type { DashboardAskPlan } from './dashboardAskContext'
import { formatLocalDateKey } from './localDate'
import { slugifyNoteStem } from './noteSlug'
import {
  DEFAULT_TEMPLATES,
  DREAM_TEMPLATES,
  JOURNAL_TEMPLATES,
  type DashboardCaptureTemplateId,
  type DreamTemplateId,
  type JournalTemplateId,
} from './noteTemplates'

export type CaptureKind = 'note' | 'journal' | 'dream' | 'task' | 'memory' | 'ask'

export interface DashboardCaptureRequest {
  kind: CaptureKind
  nonce: number
}

export interface CaptureKindConfig {
  kind: CaptureKind
  label: string
  slash: string
  typeName: string | null
  locality: 'Local' | 'Agent chat'
  prompt: string
}

export const CAPTURE_KIND_CONFIGS: CaptureKindConfig[] = [
  { kind: 'note', label: 'Note', slash: '/note', typeName: 'Note', locality: 'Local', prompt: '/note Capture a thought...' },
  { kind: 'journal', label: 'Journal', slash: '/journal', typeName: 'Journal', locality: 'Local', prompt: '/journal What is alive in you today?' },
  { kind: 'dream', label: 'Dream', slash: '/dream', typeName: 'Dream', locality: 'Local', prompt: '/dream What did you see, feel, or remember?' },
  { kind: 'task', label: 'Task', slash: '/task', typeName: 'Task', locality: 'Local', prompt: '/task What open loop needs a next action?' },
  { kind: 'memory', label: 'Memory', slash: '/memory', typeName: 'Memory', locality: 'Local', prompt: '/memory What should Grimoire remember?' },
  { kind: 'ask', label: 'Ask', slash: '/ask', typeName: null, locality: 'Agent chat', prompt: '/ask Ask the agent council...' },
]

interface ResolveDashboardCaptureParams {
  entries: VaultEntry[]
  input: string
  now?: Date
  selectedKind: CaptureKind
  templateId?: DashboardCaptureTemplateId | null
  vaultPath: string
}

export interface CapturedNotePlan {
  kind: 'note'
  captureKind: CaptureKind
  content: string
  entry: VaultEntry
  typeName: string
}

export interface CaptureErrorPlan {
  kind: 'error'
  message: string
}

export type DashboardCapturePlan = CapturedNotePlan | DashboardAskPlan | CaptureErrorPlan

const SLASH_COMMANDS = new Map(CAPTURE_KIND_CONFIGS.map((config) => [config.slash.slice(1), config.kind]))
const LOCALITY_FRONTMATTER = ['locality: local', 'egress: blocked', 'created_from: dashboard-capture']

function normalizeBody(text: string): string {
  return text.replace(/\r\n?/g, '\n').trim()
}

function parseLeadingSlash(input: string, selectedKind: CaptureKind) {
  const trimmed = input.trim()
  const match = /^\/([a-z]+)\b\s*/i.exec(trimmed)
  if (!match) return { body: trimmed, captureKind: selectedKind }

  const captureKind = SLASH_COMMANDS.get(match[1].toLowerCase()) ?? selectedKind
  return { body: trimmed.slice(match[0].length).trim(), captureKind }
}

function yamlString(value: string): string {
  return JSON.stringify(value.replace(/\n+/g, ' ').trim())
}

function titleSeedFromBody(body: string): string | null {
  const line = body.split('\n').find((part) => part.trim().length > 0)?.trim()
  if (!line) return null
  return line
    .replace(/^[-*]\s+\[[ xX]\]\s+/, '')
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 64)
    .trim() || null
}

function defaultTitle(captureKind: CaptureKind, date: string): string {
  if (captureKind === 'dream') return `Dream ${date}`
  if (captureKind === 'journal') return `Journal ${date}`
  if (captureKind === 'task') return `Task ${date}`
  if (captureKind === 'memory') return `Memory ${date}`
  return `Note ${date}`
}

function titleForCapture(captureKind: CaptureKind, body: string, date: string): string {
  const seed = titleSeedFromBody(body)
  if (!seed) return defaultTitle(captureKind, date)
  if (captureKind === 'dream') return `Dream ${date} - ${seed}`
  if (captureKind === 'journal') return `Journal ${date} - ${seed}`
  if (captureKind === 'memory') return `Memory - ${seed}`
  return seed
}

function statusForCapture(captureKind: CaptureKind): string | null {
  if (captureKind === 'task') return 'Open'
  if (captureKind === 'memory') return 'Review'
  return null
}

function countWords(text: string): number {
  const matches = text.match(/\S+/g)
  return matches ? matches.length : 0
}

function existingSlugs(entries: VaultEntry[], vaultPath: string): Set<string> {
  const prefix = `${vaultPath.replace(/\/+$/g, '')}/`
  return new Set(entries.map((entry) => {
    const relative = entry.path.startsWith(prefix) ? entry.path.slice(prefix.length) : entry.filename
    return relative.replace(/\.md$/i, '').toLowerCase()
  }))
}

function uniqueSlug(title: string, entries: VaultEntry[], vaultPath: string): string {
  const used = existingSlugs(entries, vaultPath)
  const base = slugifyNoteStem(title)
  let candidate = base
  let suffix = 2
  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${suffix}`
    suffix += 1
  }
  return candidate
}

function buildEntry({
  body,
  date,
  slug,
  status,
  templateId,
  title,
  typeName,
  vaultPath,
}: {
  body: string
  date: string
  slug: string
  status: string | null
  templateId?: DashboardCaptureTemplateId | null
  title: string
  typeName: string
  vaultPath: string
}): VaultEntry {
  const now = Math.floor(Date.now() / 1000)
  return {
    path: `${vaultPath}/${slug}.md`,
    filename: `${slug}.md`,
    title,
    isA: typeName,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status,
    archived: false,
    modifiedAt: now,
    createdAt: now,
    fileSize: 0,
    snippet: body.slice(0, 160),
    wordCount: countWords(body),
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    properties: {
      locality: 'local',
      egress: 'blocked',
      created_from: 'dashboard-capture',
      date,
      ...(templateId ? { capture_template: templateId } : {}),
    },
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    hasH1: true,
    fileKind: 'markdown',
  }
}

function templateIdForCapture(
  captureKind: CaptureKind,
  templateId?: DashboardCaptureTemplateId | null,
): DashboardCaptureTemplateId | null {
  if (captureKind === 'journal') {
    return templateId && templateId in JOURNAL_TEMPLATES ? templateId as JournalTemplateId : 'daily'
  }
  if (captureKind === 'dream') {
    return templateId && templateId in DREAM_TEMPLATES ? templateId as DreamTemplateId : 'capture'
  }
  return null
}

function templateForCapture(captureKind: CaptureKind, templateId?: DashboardCaptureTemplateId | null): string {
  const id = templateIdForCapture(captureKind, templateId)
  if (captureKind === 'journal' && id) return JOURNAL_TEMPLATES[id as JournalTemplateId]
  if (captureKind === 'dream' && id) return DREAM_TEMPLATES[id as DreamTemplateId]
  return ''
}

function templateHeadingForCapture(captureKind: CaptureKind, templateId?: DashboardCaptureTemplateId | null): string {
  if (captureKind === 'journal') {
    if (templateId === 'evening') return '## Evening Review'
    if (templateId === 'weekly') return '## Week Thread'
    if (templateId === 'decision') return '## Decision'
    return '## Check-in'
  }
  if (captureKind === 'dream') {
    if (templateId === 'lucid') return '## Lucid Moment'
    if (templateId === 'nightmare') return '## Nightmare'
    if (templateId === 'symbol') return '## Symbol'
    return '## Dream'
  }
  return ''
}

function bodyForCapture(captureKind: CaptureKind, body: string, templateId?: DashboardCaptureTemplateId | null): string {
  if (captureKind === 'task') return DEFAULT_TEMPLATES.Task.replace('- [ ] ', `- [ ] ${body}`)
  if (captureKind === 'memory') {
    return DEFAULT_TEMPLATES.Memory
      .replace('## Source\n\n', '## Source\n\nDashboard capture\n\n')
      .replace('## Memory\n\n', `## Memory\n\n${body}\n\n`)
  }
  if (captureKind === 'journal' || captureKind === 'dream') {
    if (!body.trim()) return templateForCapture(captureKind, templateId)
    return injectBodyAfterHeading(
      templateForCapture(captureKind, templateId),
      templateHeadingForCapture(captureKind, templateId),
      body,
    )
  }
  return `${body}\n`
}

function canCreateBlankTemplateCapture(captureKind: CaptureKind): boolean {
  return captureKind === 'journal' || captureKind === 'dream'
}

function injectBodyAfterHeading(template: string, heading: string, body: string): string {
  const marker = `${heading}\n\n`
  if (!template.includes(marker)) return `${heading}\n\n${body}\n\n${template}`
  return template.replace(marker, `${marker}${body}\n\n`)
}

function buildContent(
  title: string,
  typeName: string,
  status: string | null,
  date: string,
  body: string,
  templateId?: DashboardCaptureTemplateId | null,
): string {
  const frontmatter = ['---', `title: ${yamlString(title)}`, `type: ${typeName}`]
  if (status) frontmatter.push(`status: ${status}`)
  frontmatter.push(`date: ${date}`)
  if (templateId) frontmatter.push(`capture_template: ${templateId}`)
  frontmatter.push(...LOCALITY_FRONTMATTER, '---')
  return `${frontmatter.join('\n')}\n# ${title}\n\n${body}`
}

/** Resolve quick capture text into either a durable note plan or an AI prompt plan. */
export async function resolveDashboardCapture({
  entries,
  input,
  now = new Date(),
  selectedKind,
  templateId,
  vaultPath,
}: ResolveDashboardCaptureParams): Promise<DashboardCapturePlan> {
  const { body, captureKind } = parseLeadingSlash(input, selectedKind)
  const normalizedBody = normalizeBody(body)
  if (!normalizedBody && !canCreateBlankTemplateCapture(captureKind)) {
    return { kind: 'error', message: 'Write something to capture first' }
  }
  if (captureKind === 'ask') {
    const { buildDashboardAskPlan } = await import('./dashboardAskContext')
    return buildDashboardAskPlan(entries, normalizedBody)
  }

  const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === captureKind)
  const typeName = config?.typeName ?? 'Note'
  const localDate = formatLocalDateKey(now)
  const title = titleForCapture(captureKind, normalizedBody, localDate)
  const slug = uniqueSlug(title, entries, vaultPath)
  const status = statusForCapture(captureKind)
  const activeTemplateId = templateIdForCapture(captureKind, templateId)
  const noteBody = bodyForCapture(captureKind, normalizedBody, activeTemplateId)
  const entry = buildEntry({ body: normalizedBody, date: localDate, slug, status, templateId: activeTemplateId, title, typeName, vaultPath })
  return {
    kind: 'note',
    captureKind,
    content: buildContent(title, typeName, status, localDate, noteBody, activeTemplateId),
    entry,
    typeName,
  }
}

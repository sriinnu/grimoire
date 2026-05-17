import type { VaultEntry } from '../types'
import { slugifyNoteStem } from './noteSlug'

export type CaptureKind = 'note' | 'journal' | 'dream' | 'task' | 'memory' | 'ask'

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
  vaultPath: string
}

export interface CapturedNotePlan {
  kind: 'note'
  captureKind: CaptureKind
  content: string
  entry: VaultEntry
  typeName: string
}

export interface CapturedAskPlan {
  kind: 'ask'
  prompt: string
}

export interface CaptureErrorPlan {
  kind: 'error'
  message: string
}

export type DashboardCapturePlan = CapturedNotePlan | CapturedAskPlan | CaptureErrorPlan

const SLASH_COMMANDS = new Map(CAPTURE_KIND_CONFIGS.map((config) => [config.slash.slice(1), config.kind]))
const LOCALITY_FRONTMATTER = ['locality: local', 'egress: blocked', 'created_from: dashboard-capture']

function formatLocalDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

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
  if (captureKind === 'dream') return `Dream - ${seed}`
  if (captureKind === 'journal') return `Journal - ${seed}`
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
  slug,
  status,
  title,
  typeName,
  vaultPath,
}: {
  body: string
  slug: string
  status: string | null
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

function bodyForCapture(captureKind: CaptureKind, body: string): string {
  if (captureKind === 'task') return `- [ ] ${body}\n`
  if (captureKind === 'memory') {
    return `## Source\n\nDashboard capture\n\n## Memory\n\n${body}\n\n## Confidence\n\nmedium\n\n## Review\n\n- [ ] Verify or crystallize this memory.\n`
  }
  if (captureKind === 'journal') return `## Check-in\n\n${body}\n\n## Signals\n\n## Next\n`
  if (captureKind === 'dream') return `## Dream\n\n${body}\n\n## Symbols\n\n## Emotional Weather\n\n## Thread\n`
  return `${body}\n`
}

function buildContent(title: string, typeName: string, status: string | null, body: string): string {
  const frontmatter = ['---', `title: ${yamlString(title)}`, `type: ${typeName}`]
  if (status) frontmatter.push(`status: ${status}`)
  frontmatter.push(...LOCALITY_FRONTMATTER, '---')
  return `${frontmatter.join('\n')}\n# ${title}\n\n${body}`
}

/** Resolve quick capture text into either a durable note plan or an AI prompt plan. */
export function resolveDashboardCapture({
  entries,
  input,
  now = new Date(),
  selectedKind,
  vaultPath,
}: ResolveDashboardCaptureParams): DashboardCapturePlan {
  const { body, captureKind } = parseLeadingSlash(input, selectedKind)
  const normalizedBody = normalizeBody(body)
  if (!normalizedBody) return { kind: 'error', message: 'Write something to capture first' }
  if (captureKind === 'ask') return { kind: 'ask', prompt: normalizedBody }

  const config = CAPTURE_KIND_CONFIGS.find((item) => item.kind === captureKind)
  const typeName = config?.typeName ?? 'Note'
  const localDate = formatLocalDate(now)
  const title = titleForCapture(captureKind, normalizedBody, localDate)
  const slug = uniqueSlug(title, entries, vaultPath)
  const status = statusForCapture(captureKind)
  const noteBody = bodyForCapture(captureKind, normalizedBody)
  const entry = buildEntry({ body: normalizedBody, slug, status, title, typeName, vaultPath })
  return {
    kind: 'note',
    captureKind,
    content: buildContent(title, typeName, status, noteBody),
    entry,
    typeName,
  }
}

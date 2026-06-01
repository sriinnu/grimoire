import type { VaultEntry } from '../types'
import { formatLocalDateKey } from '../utils/localDate'
import { slugifyNoteStem as slugify } from '../utils/noteSlug'
import { DEFAULT_TEMPLATES } from '../utils/noteTemplates'
import { resolveEntry } from '../utils/wikilink'

export type NoteFrontmatterValue = string | number | boolean
export type NoteFrontmatterPair = readonly [key: string, value: NoteFrontmatterValue]

export interface NewEntryParams {
  path: string
  slug: string
  title: string
  type: string
  status: string | null
  properties?: VaultEntry['properties']
}

/** Build the vault entry metadata for a newly created Markdown file. */
export function buildNewEntry({ path, slug, title, type, status, properties = {} }: NewEntryParams): VaultEntry {
  const now = Math.floor(Date.now() / 1000)
  return {
    path, filename: `${slug}.md`, title, isA: type,
    aliases: [], belongsTo: [], relatedTo: [],
    status, archived: false,
    modifiedAt: now, createdAt: now, fileSize: 0,
    snippet: '', wordCount: 0, relationships: {}, icon: null, color: null, order: null, outgoingLinks: [], sidebarLabel: null, template: null, sort: null, view: null, visible: null, properties, organized: false, favorite: false, favoriteIndex: null, listPropertiesDisplay: [], hasH1: false,
  }
}

export { slugify, DEFAULT_TEMPLATES }

/** Convert a filename slug to a human-readable title. */
export function slugToTitle(slug: string): string {
  return slug.split('-').filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

export interface UntitledNameParams {
  entries: VaultEntry[]
  type: string
  pendingTitles?: Set<string>
}

/** Generate a unique "Untitled <type>" name by checking existing entries and pending names. */
export function generateUntitledName({ entries, type, pendingTitles }: UntitledNameParams): string {
  const baseName = `Untitled ${type.toLowerCase()}`
  const existingTitles = new Set(entries.map(e => e.title))
  if (pendingTitles) pendingTitles.forEach((title) => existingTitles.add(title))
  let title = baseName
  let counter = 2
  while (existingTitles.has(title)) {
    title = `${baseName} ${counter}`
    counter++
  }
  return title
}

export interface EntryMatchParams {
  entry: VaultEntry
  target: string
}

/** Resolve a target against a single entry using the same wikilink rules as the editor. */
export function entryMatchesTarget({ entry, target }: EntryMatchParams): boolean {
  return resolveEntry([entry], target) === entry
}

export interface TemplateLookupParams {
  entries: VaultEntry[]
  typeName: string
}

/** Look up the template for a given type from the type entry or defaults. */
export function resolveTemplate({ entries, typeName }: TemplateLookupParams): string | null {
  const typeEntry = entries.find((entry) => entry.isA === 'Type' && entry.title === typeName)
  return typeEntry?.template ?? DEFAULT_TEMPLATES[typeName] ?? null
}

export interface NoteContentParams {
  title: string | null
  type: string
  status: string | null
  frontmatter?: NoteFrontmatterPair[]
  template?: string | null
  initialEmptyHeading?: boolean
}

export interface LocalLifeLaneMetadata {
  frontmatter: NoteFrontmatterPair[]
  properties: VaultEntry['properties']
}

export type LocalLifeLaneCreationSource = 'lane-create' | 'named-create'

const DATED_LOCAL_LIFE_LANES = new Set(['journal', 'dream'])
const LOCAL_LIFE_LANE_CONTEXT: NoteFrontmatterPair[] = [
  ['agent_context', 'blocked_private_lane'],
  ['export_context', 'blocked_private_lane'],
  ['sync_context', 'local_private_lane'],
]

/** Resolve local-only metadata for personal lanes that must stay portable across runtimes. */
export function resolveLocalLifeLaneMetadata(
  typeName: string,
  now = new Date(),
  createdFrom: LocalLifeLaneCreationSource = 'lane-create',
): LocalLifeLaneMetadata | null {
  if (!DATED_LOCAL_LIFE_LANES.has(typeName.trim().toLowerCase())) return null

  const date = formatLocalDateKey(now)
  return {
    frontmatter: [
      ['date', date],
      ['locality', 'local'],
      ['egress', 'blocked'],
      ['created_from', createdFrom],
      ...LOCAL_LIFE_LANE_CONTEXT,
    ],
    properties: {
      date,
      locality: 'local',
      egress: 'blocked',
      created_from: createdFrom,
      agent_context: 'blocked_private_lane',
      export_context: 'blocked_private_lane',
      sync_context: 'local_private_lane',
    },
  }
}

function buildNoteBody({ template, initialEmptyHeading }: Pick<NoteContentParams, 'template' | 'initialEmptyHeading'>): string {
  if (initialEmptyHeading) {
    return template ? `\n# \n\n${template}` : '\n# \n\n'
  }
  return template ? `\n${template}` : ''
}

/** Build portable Markdown for a new note, preserving frontmatter readability. */
export function buildNoteContent({ title, type, status, frontmatter = [], template, initialEmptyHeading = false }: NoteContentParams): string {
  const lines = ['---']
  if (title) lines.push(`title: ${title}`)
  lines.push(`type: ${type}`)
  if (status) lines.push(`status: ${status}`)
  for (const [key, value] of frontmatter) lines.push(`${key}: ${value}`)
  lines.push('---')
  const body = buildNoteBody({ template, initialEmptyHeading })
  return `${lines.join('\n')}\n${body}`
}

export interface NewNoteParams {
  title: string
  type: string
  vaultPath: string
  template?: string | null
}

export interface NewTypeParams {
  typeName: string
  vaultPath: string
}

export type ResolvedEntry = { entry: VaultEntry; content: string }

export interface BlockedCreationPlan {
  status: 'blocked'
  message: string
}

interface ReadyCreationPlan {
  status: 'create'
  resolved: ResolvedEntry
}

interface ExistingTypeCreationPlan {
  status: 'existing'
  entry: VaultEntry
}

export type NoteCreationPlan = BlockedCreationPlan | ReadyCreationPlan
export type TypeCreationPlan = BlockedCreationPlan | ExistingTypeCreationPlan | ReadyCreationPlan

/** Resolve a named note into entry metadata plus Markdown body. */
export function resolveNewNote({ title, type, vaultPath, template }: NewNoteParams): ResolvedEntry {
  const slug = slugify(title)
  const status = null
  const lifeLaneMetadata = resolveLocalLifeLaneMetadata(type, new Date(), 'named-create')
  const entry = buildNewEntry({
    path: `${vaultPath}/${slug}.md`,
    slug,
    title,
    type,
    status,
    properties: lifeLaneMetadata?.properties,
  })
  return {
    entry,
    content: buildNoteContent({ title, type, status, frontmatter: lifeLaneMetadata?.frontmatter, template }),
  }
}

/** Resolve a custom Type definition note. */
export function resolveNewType({ typeName, vaultPath }: NewTypeParams): ResolvedEntry {
  const slug = slugify(typeName)
  const entry = buildNewEntry({ path: `${vaultPath}/${slug}.md`, slug, title: typeName, type: 'Type', status: null })
  return { entry, content: `---\ntype: Type\n---\n` }
}

function normalizeComparablePath(path: string): string {
  return path.replace(/\\/g, '/').toLocaleLowerCase()
}

function findPathCollision(entries: VaultEntry[], path: string): VaultEntry | undefined {
  const target = normalizeComparablePath(path)
  return entries.find((entry) => normalizeComparablePath(entry.path) === target)
}

function buildCreationCollisionMessage({ noun, title, path }: { noun: 'note' | 'type'; title: string; path: string }): string {
  const filename = path.split('/').pop() ?? path
  return `Cannot create ${noun} "${title}" because ${filename} already exists`
}

function findEquivalentTypeEntry(entries: VaultEntry[], typeName: string): VaultEntry | undefined {
  const trimmed = typeName.trim()
  const targetSlug = slugify(trimmed)
  return entries.find((entry) =>
    entry.isA === 'Type' && (entry.title === trimmed || slugify(entry.title) === targetSlug)
  )
}

/** Plan a note creation and block path collisions before disk writes happen. */
export function planNewNoteCreation({
  entries,
  title,
  type,
  vaultPath,
  template,
}: NewNoteParams & { entries: VaultEntry[] }): NoteCreationPlan {
  const resolved = resolveNewNote({ title, type, vaultPath, template })
  const collision = findPathCollision(entries, resolved.entry.path)
  if (collision) {
    return {
      status: 'blocked',
      message: buildCreationCollisionMessage({ noun: 'note', title, path: resolved.entry.path }),
    }
  }
  return { status: 'create', resolved }
}

/** Plan a Type creation while treating equivalent Type notes as existing definitions. */
export function planNewTypeCreation({
  entries,
  typeName,
  vaultPath,
}: NewTypeParams & { entries: VaultEntry[] }): TypeCreationPlan {
  const existingType = findEquivalentTypeEntry(entries, typeName)
  if (existingType) return { status: 'existing', entry: existingType }

  const resolved = resolveNewType({ typeName, vaultPath })
  const collision = findPathCollision(entries, resolved.entry.path)
  if (collision) {
    return {
      status: 'blocked',
      message: buildCreationCollisionMessage({ noun: 'type', title: typeName, path: resolved.entry.path }),
    }
  }
  return { status: 'create', resolved }
}

function isAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /already exists|file exists|eexist/i.test(message)
}

/** Convert a persistence failure into user-facing creation copy. */
export function createPersistFailureMessage(entry: VaultEntry, error: unknown): string {
  if (isAlreadyExistsError(error)) {
    const noun = entry.isA === 'Type' ? 'type' : 'note'
    return buildCreationCollisionMessage({ noun, title: entry.title, path: entry.path })
  }
  return entry.isA === 'Type'
    ? 'Failed to create type — disk write error'
    : 'Failed to create note — disk write error'
}

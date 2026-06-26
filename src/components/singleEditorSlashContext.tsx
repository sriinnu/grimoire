import { createElement } from 'react'
import { FilePlus2, LayoutTemplate } from 'lucide-react'
import { Glyph } from './glyphs/Glyph'
import type { GrimoireSlashMenuItem } from '@grimoire/markdown-editor/react'
import type { useCreateBlockNote } from '@blocknote/react'
import type { VaultEntry } from '../types'
import { buildTagCollectionSuggestionItems } from './tagCollectionSuggestions'

const MAX_CONTEXT_ITEMS_PER_KIND = 5

interface VaultSlashMenuOptions {
  editor: ReturnType<typeof useCreateBlockNote>
  entries: VaultEntry[]
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  insertTag: (tag: string) => void
  insertWikilink: (target: string) => void
  query: string
}

interface TemplateInsertEditor {
  getTextCursorPosition: () => { block: unknown }
  insertBlocks: (blocks: unknown[], referenceBlock: unknown, placement: 'after') => unknown[]
  insertInlineContent?: (content: string, options: { updateSelection: boolean }) => void
  setTextCursorPosition: (block: unknown, placement: 'end') => void
  tryParseMarkdownToBlocks: (markdown: string) => unknown[]
  updateBlock: (block: unknown, update: unknown) => unknown
}

function matchesQuery(item: GrimoireSlashMenuItem, query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return true
  const haystack = [
    item.title,
    item.subtext,
    item.group,
    ...(item.aliases ?? []),
  ].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(normalized)
}

function byRecent(left: VaultEntry, right: VaultEntry) {
  return (right.modifiedAt ?? right.createdAt ?? 0) - (left.modifiedAt ?? left.createdAt ?? 0)
}

function normalizeCreationTitle(query: string): string | null {
  const title = query.trim().replace(/\s+/g, ' ')
  return title.length > 1 ? title : null
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase()
}

function entryMatchesTitle(entry: VaultEntry, title: string) {
  const target = normalizeComparable(title)
  const filenameStem = entry.filename.replace(/\.md$/i, '')
  return [
    entry.title,
    filenameStem,
    ...entry.aliases,
  ].some(value => normalizeComparable(value) === target)
}

function insertTemplateMarkdown(editor: ReturnType<typeof useCreateBlockNote>, markdown: string) {
  const templateEditor = editor as unknown as TemplateInsertEditor
  let parsedBlocks: unknown[] = []
  try {
    parsedBlocks = templateEditor.tryParseMarkdownToBlocks(markdown)
  } catch {
    parsedBlocks = []
  }

  if (parsedBlocks.length === 0) {
    templateEditor.insertInlineContent?.(markdown, { updateSelection: true })
    return
  }

  const [firstBlock, ...restBlocks] = parsedBlocks
  const cursorBlock = templateEditor.getTextCursorPosition().block
  const insertedBlock = templateEditor.updateBlock(cursorBlock, firstBlock)
  if (restBlocks.length === 0) return

  const insertedRest = templateEditor.insertBlocks(restBlocks, insertedBlock, 'after')
  const lastInserted = insertedRest[insertedRest.length - 1]
  if (lastInserted) {
    templateEditor.setTextCursorPosition(lastInserted, 'end')
  }
}

function buildRecentNoteItems(
  entries: VaultEntry[],
  insertWikilink: (target: string) => void,
): GrimoireSlashMenuItem[] {
  return entries
    .filter(entry => entry.fileKind !== 'binary')
    .sort(byRecent)
    .slice(0, MAX_CONTEXT_ITEMS_PER_KIND)
    .map(entry => ({
      key: `vault_note_${entry.path}`,
      title: `Link: ${entry.title}`,
      subtext: entry.isA ? `Insert [[${entry.title}]] from ${entry.isA}.` : `Insert [[${entry.title}]].`,
      aliases: ['recent note', 'wikilink', entry.title, entry.filename, ...entry.aliases],
      group: 'Notebook',
      icon: createElement(Glyph, { name: 'file', size: 18 }),
      onItemClick: () => insertWikilink(entry.title),
    }))
}

function buildTemplateItems(
  editor: ReturnType<typeof useCreateBlockNote>,
  entries: VaultEntry[],
): GrimoireSlashMenuItem[] {
  return entries
    .filter(entry => entry.template?.trim())
    .sort(byRecent)
    .slice(0, MAX_CONTEXT_ITEMS_PER_KIND)
    .map(entry => ({
      key: `vault_template_${entry.path}`,
      title: `Template: ${entry.title}`,
      subtext: `Insert the ${entry.title} type template.`,
      aliases: ['template', 'type template', entry.title, entry.filename],
      group: 'Notebook',
      icon: createElement(LayoutTemplate, { size: 18 }),
      onItemClick: () => insertTemplateMarkdown(editor, entry.template ?? ''),
    }))
}

function buildTagItems(
  entries: VaultEntry[],
  insertTag: (tag: string) => void,
): GrimoireSlashMenuItem[] {
  return buildTagCollectionSuggestionItems(entries, '', insertTag)
    .filter(item => item.noteType !== 'New tag')
    .slice(0, MAX_CONTEXT_ITEMS_PER_KIND)
    .map(item => ({
      key: `vault_tag_${item.entryTitle}`,
      title: `Tag: ${item.title}`,
      subtext: item.noteType ? `Insert ${item.title} (${item.noteType}).` : `Insert ${item.title}.`,
      aliases: ['tag', 'collection', item.entryTitle ?? item.title],
      group: 'Notebook',
      icon: createElement(Glyph, { name: 'tag', size: 18 }),
      onItemClick: item.onItemClick,
    }))
}

function buildCreateNoteItem(
  entries: VaultEntry[],
  query: string,
  onCreateAndOpenNote?: (title: string) => Promise<boolean>,
): GrimoireSlashMenuItem[] {
  const title = normalizeCreationTitle(query)
  if (!title || !onCreateAndOpenNote) return []
  if (entries.some(entry => entryMatchesTitle(entry, title))) return []

  return [{
    key: `vault_create_note_${title}`,
    title: `Create Page: ${title}`,
    subtext: 'Create and open a new notebook page.',
    aliases: ['create page', 'new page', 'create note', 'new note', 'wikilink', title],
    group: 'Notebook',
    icon: createElement(FilePlus2, { size: 18 }),
    onItemClick: () => { void onCreateAndOpenNote(title) },
  }]
}

function buildCreateTagItems(
  entries: VaultEntry[],
  query: string,
  insertTag: (tag: string) => void,
): GrimoireSlashMenuItem[] {
  return buildTagCollectionSuggestionItems(entries, query, insertTag)
    .filter(item => item.noteType === 'New tag' && item.entryTitle)
    .slice(0, 1)
    .map(item => ({
      key: `vault_create_tag_${item.entryTitle}`,
      title: `Create Tag: ${item.title}`,
      subtext: 'Insert a new Mem-style collection tag.',
      aliases: ['create tag', 'new tag', 'collection', item.entryTitle ?? item.title],
      group: 'Notebook',
      icon: createElement(Glyph, { name: 'tag', size: 18 }),
      onItemClick: item.onItemClick,
    }))
}

/** Builds host-owned slash rows from the currently loaded vault. */
export function buildVaultSlashMenuItems(options: VaultSlashMenuOptions): GrimoireSlashMenuItem[] {
  const {
    editor,
    entries,
    onCreateAndOpenNote,
    insertTag,
    insertWikilink,
    query,
  } = options
  return [
    ...buildRecentNoteItems(entries, insertWikilink),
    ...buildTemplateItems(editor, entries),
    ...buildTagItems(entries, insertTag),
    ...buildCreateNoteItem(entries, query, onCreateAndOpenNote),
    ...buildCreateTagItems(entries, query, insertTag),
  ].filter(item => matchesQuery(item, query))
}

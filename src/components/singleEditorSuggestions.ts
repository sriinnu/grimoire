import { useCallback } from 'react'
import type { useCreateBlockNote } from '@blocknote/react'
import { trackEvent } from '../lib/telemetry'
import type { VaultEntry } from '../types'
import { filterPersonMentions, PERSON_MENTION_MIN_QUERY } from '../utils/personMentionSuggestions'
import { attachClickHandlers, enrichSuggestionItems } from '../utils/suggestionEnrichment'
import { buildTypeEntryMap } from '../utils/typeColors'
import { deduplicateByPath, getWikilinkSuggestionCandidates } from '../utils/wikilinkSuggestions'
import { getGrimoireSlashMenuItems } from './grimoireEditorFormattingConfig'
import { buildVaultSlashMenuItems } from './singleEditorSlashContext'
import { buildTagCollectionSuggestionItems } from './tagCollectionSuggestions'
import type { WikilinkSuggestionItem } from './WikilinkSuggestionMenu'

function normalizeSuggestionQuery(query: string, triggerCharacter: string): string {
  const normalized = query.startsWith(triggerCharacter)
    ? query.slice(triggerCharacter.length)
    : query
  return normalized.trim()
}

function buildBaseSuggestionItems(entries: VaultEntry[]) {
  return deduplicateByPath(entries.map(entry => ({
    title: entry.title,
    aliases: [...new Set([entry.filename.replace(/\.md$/, ''), ...entry.aliases])],
    group: entry.isA || 'Note',
    entryType: entry.isA,
    entryTitle: entry.title,
    path: entry.path,
  })))
}

function useInsertWikilink(editor: ReturnType<typeof useCreateBlockNote>) {
  return useCallback((target: string) => {
    editor.insertInlineContent([
      { type: 'wikilink' as const, props: { target } },
      ' ',
    ], { updateSelection: true })
    trackEvent('wikilink_inserted')
  }, [editor])
}

function useInsertTag(editor: ReturnType<typeof useCreateBlockNote>) {
  return useCallback((tag: string) => {
    editor.insertInlineContent(`#${tag} `, { updateSelection: true })
    trackEvent('tag_inserted')
  }, [editor])
}

export function useSingleEditorSuggestionItems(options: {
  editor: ReturnType<typeof useCreateBlockNote>
  entries: VaultEntry[]
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  vaultPath?: string
}) {
  const {
    editor,
    entries,
    onCreateAndOpenNote,
    vaultPath,
  } = options
  const baseItems = buildBaseSuggestionItems(entries)
  const typeEntryMap = buildTypeEntryMap(entries)
  const insertWikilink = useInsertWikilink(editor)
  const insertTag = useInsertTag(editor)

  const buildItems = useCallback((query: string, triggerCharacter: '[[' | '@') => {
    const normalizedQuery = normalizeSuggestionQuery(query, triggerCharacter)
    if (triggerCharacter === '@' && normalizedQuery.length < PERSON_MENTION_MIN_QUERY) return null

    const candidates = triggerCharacter === '[['
      ? getWikilinkSuggestionCandidates(baseItems, normalizedQuery)
      : filterPersonMentions(baseItems, normalizedQuery)

    const items = attachClickHandlers(candidates, insertWikilink, vaultPath ?? '')
    return enrichSuggestionItems(items, normalizedQuery, typeEntryMap)
  }, [baseItems, insertWikilink, typeEntryMap, vaultPath])

  const getWikilinkItems = useCallback(async (query: string): Promise<WikilinkSuggestionItem[]> => (
    buildItems(query, '[[') ?? []
  ), [buildItems])

  const getPersonMentionItems = useCallback(async (query: string): Promise<WikilinkSuggestionItem[]> => (
    buildItems(query, '@') ?? []
  ), [buildItems])

  const getTagCollectionItems = useCallback(async (query: string): Promise<WikilinkSuggestionItem[]> => {
    const normalizedQuery = normalizeSuggestionQuery(query, '#')
    return buildTagCollectionSuggestionItems(entries, normalizedQuery, insertTag)
  }, [entries, insertTag])

  const getSlashMenuItems = useCallback(async (query: string) => (
    [
      ...getGrimoireSlashMenuItems(editor, query),
      ...buildVaultSlashMenuItems({
        editor,
        entries,
        onCreateAndOpenNote,
        insertTag,
        insertWikilink,
        query,
      }),
    ]
  ), [editor, entries, onCreateAndOpenNote, insertTag, insertWikilink])

  return {
    getWikilinkItems,
    getPersonMentionItems,
    getTagCollectionItems,
    getSlashMenuItems,
    insertWikilink,
  }
}

import { startTransition, useCallback, useRef } from 'react'
import { useEditorSave } from './useEditorSave'
import { extractOutgoingLinks, extractSnippet, countWords } from '../utils/wikilinks'
import { deriveRawEditorEntryState } from './rawEditorEntryState'
import { deriveDisplayTitleState } from '../utils/noteTitle'
import { detectFrontmatterState } from '../utils/frontmatter'
import type { VaultEntry } from '../types'

const EMPTY_DERIVED_ENTRY_STATE_KEY = JSON.stringify(deriveRawEditorEntryState(''))

function shouldSyncFrontmatterState(content: string): boolean {
  const frontmatterState = detectFrontmatterState(content)
  if (frontmatterState === 'invalid') return false
  return !(frontmatterState === 'none' && content.startsWith('---\n'))
}

/**
 * Key = the exact slice the frontmatter parsers consume: start of document
 * through the closing `---` delimiter (the same `/^---\n[\s\S]*?\n---/`
 * boundary parseFrontmatter uses). Body edits leave this slice untouched, so a
 * stable key lets us skip the YAML re-parse. Unterminated frontmatter is
 * unstable by definition — every keystroke could close it — so it keys on the
 * whole content, which degenerates to re-evaluating on each change.
 */
function frontmatterPrefixKey(content: string): string {
  if (!content.startsWith('---\n')) return ''
  const match = /^---\n[\s\S]*?\n---/.exec(content)
  return match ? content.slice(0, match[0].length) : content
}

interface DerivedContentState {
  content: string
  links: string[]
  frontmatterPrefix: string
  frontmatterSynced: boolean
  frontmatterPatch: Partial<VaultEntry> | null
}

export function useEditorSaveWithLinks(config: {
  updateEntry: (path: string, patch: Partial<VaultEntry>) => void
  setTabs: Parameters<typeof useEditorSave>[0]['setTabs']
  setToastMessage: (msg: string | null) => void
  onAfterSave: () => void
  onNotePersisted?: (path: string, content: string) => void
  resolvePath?: (path: string) => string
  resolvePathBeforeSave?: (path: string) => Promise<string>
  /**
   * FLUSH CONTRACT: runs synchronously before any read of the save pipeline's
   * pending content. The editor debounces its markdown serialization, so the
   * reader (autosave flush, Cmd+S, savePendingForPath) must force the pending
   * serialization into onContentChange first — otherwise it would persist
   * content that is up to the serialization debounce behind the document.
   */
  beforeFlushPending?: () => void
}) {
  const { updateEntry } = config
  // Single-entry memo of everything derived from the last content string.
  // The change handler and the save path share it, so a save that follows
  // typing (same content string) never re-scans for outgoing links.
  const derivedRef = useRef<DerivedContentState | null>(null)
  const deriveForContent = useCallback((content: string): DerivedContentState => {
    const cached = derivedRef.current
    if (cached && cached.content === content) return cached
    const links = extractOutgoingLinks(content)
    const frontmatterPrefix = frontmatterPrefixKey(content)
    let frontmatterSynced: boolean
    let frontmatterPatch: Partial<VaultEntry> | null
    if (cached && cached.frontmatterPrefix === frontmatterPrefix) {
      frontmatterSynced = cached.frontmatterSynced
      frontmatterPatch = cached.frontmatterPatch
    } else {
      frontmatterSynced = shouldSyncFrontmatterState(content)
      frontmatterPatch = frontmatterSynced ? deriveRawEditorEntryState(content) : null
    }
    const next: DerivedContentState = {
      content,
      links,
      frontmatterPrefix,
      frontmatterSynced,
      frontmatterPatch,
    }
    derivedRef.current = next
    return next
  }, [])

  const saveContent = useCallback((path: string, content: string) => {
    updateEntry(path, {
      outgoingLinks: deriveForContent(content).links,
      snippet: extractSnippet(content),
      wordCount: countWords(content),
      modifiedAt: Math.floor(Date.now() / 1000),
    })
  }, [updateEntry, deriveForContent])
  const editor = useEditorSave({
    updateVaultContent: saveContent,
    setTabs: config.setTabs,
    setToastMessage: config.setToastMessage,
    onAfterSave: config.onAfterSave,
    onNotePersisted: config.onNotePersisted,
    resolvePath: config.resolvePath,
    resolvePathBeforeSave: config.resolvePathBeforeSave,
    beforeFlushPending: config.beforeFlushPending,
  })
  const { handleContentChange: rawOnChange } = editor
  const prevLinksKeyRef = useRef('')
  const prevFmKeyRef = useRef(EMPTY_DERIVED_ENTRY_STATE_KEY)
  const prevTitleKeyRef = useRef('')
  const handleContentChange = useCallback((path: string, content: string) => {
    rawOnChange(path, content)
    const derived = deriveForContent(content)
    const key = derived.links.join('\0')
    if (key !== prevLinksKeyRef.current) {
      prevLinksKeyRef.current = key
      updateEntry(path, { outgoingLinks: derived.links })
    }
    const frontmatterPatch = derived.frontmatterSynced ? derived.frontmatterPatch : null
    const filename = path.split('/').pop() ?? path
    const titlePatch = deriveDisplayTitleState({
      content,
      filename,
      frontmatterTitle: typeof frontmatterPatch?.title === 'string' ? frontmatterPatch.title : null,
    })
    if (frontmatterPatch) {
      const fmPatch = { ...frontmatterPatch }
      delete fmPatch.title
      const fmKey = JSON.stringify(fmPatch)
      if (fmKey !== prevFmKeyRef.current) {
        prevFmKeyRef.current = fmKey
        updateEntry(path, fmPatch)
      }
    }
    const titleKey = JSON.stringify(titlePatch)
    if (titleKey !== prevTitleKeyRef.current) {
      prevTitleKeyRef.current = titleKey
      startTransition(() => {
        updateEntry(path, titlePatch)
      })
    }
  }, [rawOnChange, updateEntry, deriveForContent])
  return { ...editor, handleContentChange }
}

import { readdirSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  APP_COMMAND_DEFINITIONS,
  APP_COMMAND_IDS,
  findShortcutCommandIdForEvent,
  type AppCommandId,
} from '../../hooks/appCommandCatalog'
import { isNeighborhoodKey, isToggleSearchShortcut } from '../../hooks/noteListKeyboardModel'
import { isQuickCaptureShortcut } from '../../app/useQuickCapture'
import { inspectorJumpTarget } from '../../components/inspector/inspectorKeyboard'
import { isReadingWidthShortcut } from '../readingWidthPreference'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
import { useMultiSelectKeyboard } from '../../components/note-list/useMultiSelectKeyboard'
import type { MultiSelectState } from '../../hooks/useMultiSelect'
import type { VaultEntry } from '../../types'
import { formatChordCaps, parseKeymap, type ShortcutChord } from './chords'
import {
  AD_HOC_SHORTCUTS,
  WRITING_BINDINGS,
  allShortcutEntries,
  appCommandSheetMeta,
  appCommandShortcutEntries,
} from './registry'

const ROOT = resolve(__dirname, '../../..')

function eventInit(chord: ShortcutChord, preferControl = false): KeyboardEventInit & { key: string; code: string } {
  const mod = chord.modifiers.includes('mod')
  const key = chord.key.length === 1 ? chord.key.toLowerCase() : chord.key
  const code = /^[a-z]$/i.test(chord.key) ? `Key${chord.key.toUpperCase()}` : chord.key === '/' ? 'Slash' : chord.key
  return {
    key,
    code,
    metaKey: mod && !preferControl,
    ctrlKey: (mod && preferControl) || chord.modifiers.includes('ctrl'),
    altKey: chord.modifiers.includes('alt'),
    shiftKey: chord.modifiers.includes('shift'),
    bubbles: true,
    cancelable: true,
  }
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|js|cjs)$/.test(entry.name) && !entry.name.includes('.test.') ? [path] : []
  })
}

function installedEditorKeymapSource(): string {
  const blockNoteDir = realpathSync(join(ROOT, 'node_modules/@blocknote/core'))
  const requireFromBlockNote = createRequire(join(blockNoteDir, 'package.json'))
  const markPackages = ['bold', 'italic', 'underline', 'strike'].map((mark) =>
    readFileSync(requireFromBlockNote.resolve(`@tiptap/extension-${mark}`), 'utf8'))
  const blockNoteSource = sourceFiles(join(blockNoteDir, 'src')).map((file) => readFileSync(file, 'utf8'))
  return [...markPackages, ...blockNoteSource].join('\n')
}

describe('app command shortcuts on the sheet', () => {
  it('places every command that owns a shortcut', () => {
    const missing = (Object.keys(APP_COMMAND_DEFINITIONS) as AppCommandId[])
      .filter((id) => APP_COMMAND_DEFINITIONS[id].shortcut && !appCommandSheetMeta(id))
    expect(missing).toEqual([])
  })

  it('renders the same keys the palette and menus advertise', () => {
    for (const entry of appCommandShortcutEntries()) {
      const display = APP_COMMAND_DEFINITIONS[entry.id as AppCommandId].shortcut?.display
      const rendered = entry.chords.map((chord) => formatChordCaps(chord, 'mac').join('')).join(' / ')
      expect(rendered, entry.id).toBe(display)
    }
  })

  it('resolves every listed chord back to its command with Cmd and with Ctrl', () => {
    for (const entry of appCommandShortcutEntries()) {
      for (const chord of entry.chords) {
        expect(findShortcutCommandIdForEvent(eventInit(chord) as KeyboardEvent), entry.id).toBe(entry.id)
        expect(findShortcutCommandIdForEvent(eventInit(chord, true) as KeyboardEvent), entry.id).toBe(entry.id)
      }
    }
  })

  it('binds Cmd+/ and Ctrl+/ to the shortcut sheet', () => {
    const base = { key: '/', code: 'Slash', altKey: false, shiftKey: false }
    expect(findShortcutCommandIdForEvent({ ...base, metaKey: true, ctrlKey: false })).toBe(APP_COMMAND_IDS.viewKeyboardShortcuts)
    expect(findShortcutCommandIdForEvent({ ...base, metaKey: false, ctrlKey: true })).toBe(APP_COMMAND_IDS.viewKeyboardShortcuts)
  })
})

describe('ad-hoc shortcuts are handled by their real handlers', () => {
  const notes = [{ path: 'a.md' }, { path: 'b.md' }] as VaultEntry[]

  function fireNavigation(chord: ShortcutChord) {
    const onSelectNote = vi.fn()
    const { unmount } = renderHook(() => useKeyboardNavigation({
      activeTabPath: null,
      visibleNotesRef: { current: notes },
      onReplaceActiveTab: vi.fn(),
      onSelectNote,
    }))
    window.dispatchEvent(new KeyboardEvent('keydown', eventInit(chord)))
    unmount()
    return onSelectNote.mock.calls.length > 0
  }

  function fireSelectAll(chord: ShortcutChord) {
    const selectAll = vi.fn()
    const multiSelect = { isMultiSelecting: false, selectAll, clear: vi.fn() } as unknown as MultiSelectState
    const { unmount } = renderHook(() => useMultiSelectKeyboard({ multiSelect, isEntityView: false }))
    window.dispatchEvent(new KeyboardEvent('keydown', eventInit(chord)))
    unmount()
    return selectAll.mock.calls.length > 0
  }

  const verifiers: Record<string, (chord: ShortcutChord) => boolean> = {
    'next-page-in-list': fireNavigation,
    'previous-page-in-list': fireNavigation,
    'find-in-page': (chord) => isToggleSearchShortcut(eventInit(chord)),
    'open-neighborhood': (chord) => isNeighborhoodKey(eventInit(chord) as KeyboardEvent),
    'select-all-pages': fireSelectAll,
    'quick-capture': (chord) => isQuickCaptureShortcut(eventInit(chord)),
    'inspector-jump': (chord) => inspectorJumpTarget(eventInit(chord)) !== null,
    'cycle-reading-width': (chord) => isReadingWidthShortcut(eventInit(chord)),
  }

  it.each(AD_HOC_SHORTCUTS.map((entry) => [entry.id, entry] as const))('%s', (id, entry) => {
    const verify = verifiers[id]
    expect(verify, `add a handler check for ${id}`).toBeDefined()
    for (const chord of entry.chords) expect(verify(chord)).toBe(true)
  })
})

describe('writing shortcuts', () => {
  const source = installedEditorKeymapSource()
  const singleEditorView = readFileSync(join(ROOT, 'src/components/SingleEditorView.tsx'), 'utf8')

  it.each(WRITING_BINDINGS.map((binding) => [binding.id, binding] as const))('%s is registered by the editor', (_id, binding) => {
    if (binding.trigger !== undefined) {
      expect(singleEditorView).toContain(`triggerCharacter="${binding.trigger}"`)
      return
    }
    const keymap = binding.keymap ?? ''
    const heading = /^Mod-Alt-([1-6])$/.exec(keymap)
    if (heading) {
      expect(source).toContain('`Mod-Alt-${level}`')
      return
    }
    expect(source).toMatch(new RegExp(`(?:^|[\\s{,])["']?${keymap.replace(/-/g, '\\-')}["']?\\s*:`, 'm'))
  })

  it('never shadows an app command shortcut', () => {
    for (const binding of WRITING_BINDINGS) {
      if (!binding.keymap) continue
      const chord = parseKeymap(binding.keymap)
      if (!chord.modifiers.includes('mod')) continue
      expect(findShortcutCommandIdForEvent(eventInit(chord) as KeyboardEvent), binding.id).toBeNull()
    }
  })
})

describe('sheet as a whole', () => {
  it('has unique ids and no chord listed twice', () => {
    const entries = allShortcutEntries()
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(entries.length)
    const chords = entries.flatMap((entry) => entry.chords.map((chord) => formatChordCaps(chord, 'mac').join('')))
    expect(chords.filter((chord, index) => chords.indexOf(chord) !== index)).toEqual([])
  })
})

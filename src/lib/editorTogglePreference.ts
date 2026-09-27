import { APP_STORAGE_KEYS } from '../constants/appStorage'

type Listener = () => void

/**
 * A remembered on/off switch for the editor, dependency-free so the command
 * palette can import it on the boot path. Storage failures fall back to the
 * default and the in-memory value still applies.
 */
export interface EditorTogglePreference {
  isEnabled(): boolean
  setEnabled(next: boolean): void
  toggle(): void
  subscribe(listener: Listener): () => void
  /** Test seam: re-read storage. */
  resetForTests(): void
}

export function createEditorTogglePreference(storageKey: string, defaultEnabled: boolean): EditorTogglePreference {
  const listeners = new Set<Listener>()

  const read = (): boolean => {
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === '1') return true
      if (stored === '0') return false
    } catch {
      // fall through
    }
    return defaultEnabled
  }

  let enabled = read()

  const setEnabled = (next: boolean) => {
    if (next === enabled) return
    enabled = next
    try {
      localStorage.setItem(storageKey, next ? '1' : '0')
    } catch {
      // Storage may be unavailable; the in-memory value still applies.
    }
    listeners.forEach((listener) => listener())
  }

  return {
    isEnabled: () => enabled,
    setEnabled,
    toggle: () => setEnabled(!enabled),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    resetForTests() {
      enabled = read()
    },
  }
}

/** Typewriter mode keeps the caret line vertically centred while typing. Off by default. */
export const typewriterPreference = createEditorTogglePreference(APP_STORAGE_KEYS.typewriterMode, false)

/** Native spellcheck on the note body. Off by default, as it always was; autocorrect stays off either way. */
export const spellcheckPreference = createEditorTogglePreference(APP_STORAGE_KEYS.editorSpellcheck, false)

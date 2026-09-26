import { APP_STORAGE_KEYS } from '../constants/appStorage'

// Kept dependency-free: the command palette imports this on the boot path,
// while the outline rail itself lives in the lazy editor chunk.
type Listener = () => void

const listeners = new Set<Listener>()

function readStoredPreference(): boolean {
  try {
    return localStorage.getItem(APP_STORAGE_KEYS.headingOutline) !== '0'
  } catch {
    return true
  }
}

let enabled = readStoredPreference()

export function isHeadingOutlineEnabled(): boolean {
  return enabled
}

export function setHeadingOutlineEnabled(next: boolean): void {
  if (next === enabled) return
  enabled = next
  try {
    localStorage.setItem(APP_STORAGE_KEYS.headingOutline, next ? '1' : '0')
  } catch {
    // Storage may be unavailable; the in-memory value still applies.
  }
  listeners.forEach((listener) => listener())
}

export function toggleHeadingOutline(): void {
  setHeadingOutlineEnabled(!enabled)
}

export function subscribeHeadingOutline(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetHeadingOutlinePreferenceForTests(): void {
  enabled = readStoredPreference()
}

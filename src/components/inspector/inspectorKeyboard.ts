import type { InspectorSectionId } from './inspectorSectionState'

/** Sections dispatch nothing; the inspector asks one of them to open and take focus. */
export const INSPECTOR_JUMP_EVENT = 'grimoire:inspector-jump'

export interface InspectorJumpDetail {
  section: InspectorSectionId
}

const JUMP_KEYS: Record<string, InspectorSectionId> = {
  '1': 'about',
  '2': 'connections',
  '3': 'history',
}

type KeyLike = Pick<KeyboardEvent, 'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>

/**
 * ⌃1 / ⌃2 / ⌃3 (the Control key on every platform) jump to About /
 * Connections / History. The spec asked for ⌘⌥1/2/3, but BlockNote owns those
 * for headings, and the shortcuts sheet refuses to list one chord twice. The
 * inspector only answers while focus is inside it.
 */
export function inspectorJumpTarget(event: KeyLike): InspectorSectionId | null {
  if (!event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return null
  const digit = event.code.startsWith('Digit') ? event.code.slice(5) : event.key
  return JUMP_KEYS[digit] ?? null
}

/** Escape closes the panel, but never while typing in a field or a contenteditable. */
export function isInspectorEscape(event: KeyLike, target: EventTarget | null): boolean {
  if (event.key !== 'Escape') return false
  if (!(target instanceof HTMLElement)) return true
  if (target.isContentEditable) return false
  const tag = target.tagName
  return tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT'
}

export function requestInspectorJump(section: InspectorSectionId): void {
  window.dispatchEvent(new CustomEvent<InspectorJumpDetail>(INSPECTOR_JUMP_EVENT, { detail: { section } }))
}

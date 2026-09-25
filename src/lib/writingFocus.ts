/**
 * Writing focus — chrome steps back while you type, returns when you reach
 * for the mouse. Ulysses hides its toolbar on keystroke; iA Writer dims
 * everything but the text. Sriinnu: the page should be the loudest thing on
 * screen the moment you start writing.
 *
 * Mechanism: a single `data-writing` attribute on <html>; CSS in
 * writing-focus.css decides what fades. No React state, no re-renders.
 */

export const WRITING_ATTRIBUTE = 'data-writing'

const EDITABLE_SURFACE_SELECTOR = '.editor__blocknote-container, .cm-editor'
/** Pointer travel (px) that counts as "reaching for the mouse", not a bump. */
const REVEAL_DISTANCE_PX = 12

function isWritingKey(event: KeyboardEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey) return false
  return event.key.length === 1 || event.key === 'Enter' || event.key === 'Backspace' || event.key === 'Delete'
}

function isInsideEditor(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITABLE_SURFACE_SELECTOR) !== null
}

/** Installs the listeners; returns a cleanup for tests and hot reload. */
export function installWritingFocus(documentObject: Document): () => void {
  const root = documentObject.documentElement
  let travelled = 0
  let lastPointer: { x: number; y: number } | null = null

  const enter = () => {
    if (root.hasAttribute(WRITING_ATTRIBUTE)) return
    root.setAttribute(WRITING_ATTRIBUTE, '')
    travelled = 0
    lastPointer = null
  }
  const leave = () => {
    if (root.hasAttribute(WRITING_ATTRIBUTE)) root.removeAttribute(WRITING_ATTRIBUTE)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') return leave()
    if (isWritingKey(event) && isInsideEditor(event.target)) enter()
  }
  const onPointerMove = (event: PointerEvent) => {
    if (!root.hasAttribute(WRITING_ATTRIBUTE)) return
    if (lastPointer) travelled += Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y)
    lastPointer = { x: event.clientX, y: event.clientY }
    if (travelled >= REVEAL_DISTANCE_PX) leave()
  }
  const onPointerDown = (event: PointerEvent) => {
    if (!isInsideEditor(event.target)) leave()
  }

  documentObject.addEventListener('keydown', onKeyDown, true)
  documentObject.addEventListener('pointermove', onPointerMove, { passive: true })
  documentObject.addEventListener('pointerdown', onPointerDown, true)
  const view = documentObject.defaultView
  view?.addEventListener('blur', leave)

  return () => {
    documentObject.removeEventListener('keydown', onKeyDown, true)
    documentObject.removeEventListener('pointermove', onPointerMove)
    documentObject.removeEventListener('pointerdown', onPointerDown, true)
    view?.removeEventListener('blur', leave)
    leave()
  }
}

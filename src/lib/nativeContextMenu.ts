/**
 * Prevents the host WebView/browser menu after app-level right-click handlers
 * have had first chance to open custom note, folder, calendar, or sidebar menus.
 */
export function preventNativeContextMenu(event: Event): void {
  if (event.defaultPrevented) return
  if (shouldPreserveNativeContextMenu(event)) return
  event.preventDefault()
}

function eventTargetElement(event: Event): Element | null {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  const target = path[0] ?? event.target
  if (target instanceof Element) return target
  if (target instanceof Text) return target.parentElement
  return null
}

function hasContextSelection(target: Element): boolean {
  const selection = target.ownerDocument.defaultView?.getSelection()
  if (!selection || selection.isCollapsed || selection.toString().trim().length === 0) return false

  for (let index = 0; index < selection.rangeCount; index += 1) {
    try {
      if (selection.getRangeAt(index).intersectsNode(target)) return true
    } catch {
      return true
    }
  }

  return false
}

function shouldPreserveNativeContextMenu(event: Event): boolean {
  const target = eventTargetElement(event)
  if (!target) return false

  if (hasContextSelection(target)) return true
  if (target instanceof HTMLElement && target.isContentEditable) return true

  return Boolean(target.closest([
    'a[href]',
    'audio',
    'canvas',
    'img',
    'input',
    'select',
    'textarea',
    'video',
    '[contenteditable]:not([contenteditable="false"])',
    '[data-allow-native-context-menu="true"]',
    '[data-native-context-menu="true"]',
    '[role="textbox"]',
  ].join(',')))
}

/**
 * Installs the app-shell context menu guard in bubble phase.
 *
 * React and Radix context menus need to inspect an uncancelled event first.
 * The document-level bubble listener still cancels the host menu before the
 * browser/WebView default action runs.
 */
export function installAppContextMenuGuard(target: Document = document): () => void {
  target.addEventListener('contextmenu', preventNativeContextMenu)
  return () => target.removeEventListener('contextmenu', preventNativeContextMenu)
}

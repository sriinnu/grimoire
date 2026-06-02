import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import './motion.css'
import './motion-memory.css'
import './motion-agent-council.css'
import App from './App.tsx'
import './system-themes.css'
import './theme-polish.css'
import './theme-editor-canvas.css'
import './sidebar-brand.css'
import './sidebar-appearance.css'
import './sidebar-artwork-layer.css'
import './sidebar-glyph-polish.css'
import './sidebar-glyph-refinement.css'
import './sidebar-artwork-themes.css'
import './sidebar-artwork-atlas.css'
import './sidebar-artwork-polish.css'
import './sidebar-pouch-effect.css'
import { PlatformChrome } from './components/PlatformChrome'
import { applyStoredAppearance } from './lib/appearance'
import { loadFontAssetsForAppearance } from './lib/fontConfig'
import { applyStoredThemeMode } from './lib/themeMode'
import {
  APP_COMMAND_EVENT_NAME,
  isAppCommandId,
  isNativeMenuCommandId,
} from './hooks/appCommandDispatcher'
import {
  getShortcutEventInit,
  type AppCommandShortcutEventInit,
  type AppCommandShortcutEventOptions,
} from './hooks/appCommandCatalog'
import { shouldUseLinuxWindowChrome, shouldUseMacOverlayChrome } from './utils/platform'
import { TooltipProvider } from '@/components/ui/tooltip'

const EDITOR_DROP_SELECTOR = '.editor__blocknote-container'

function dataTransferHasFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false
  if (dataTransfer.files.length > 0) return true
  if (Array.from(dataTransfer.types).includes('Files')) return true

  return Array.from(dataTransfer.items).some((item) => item.kind === 'file')
}

function isEditorDropTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(EDITOR_DROP_SELECTOR) !== null
}

function preventFileDropNavigation(event: DragEvent): void {
  if (isEditorDropTarget(event.target)) return
  if (!dataTransferHasFiles(event.dataTransfer)) return

  event.preventDefault()
}

document.addEventListener('dragover', preventFileDropNavigation, true)
document.addEventListener('drop', preventFileDropNavigation, true)

// Disable native WebKit context menu in Tauri (WKWebView intercepts right-click
// at native level before React's synthetic events can call preventDefault).
// Capture phase fires first → prevents native menu; React bubble phase still fires
// → our custom context menus (e.g. sidebar right-click) work correctly.
if ('__TAURI__' in window || '__TAURI_INTERNALS__' in window) {
  document.addEventListener('contextmenu', (e) => e.preventDefault(), true)
}

if (shouldUseLinuxWindowChrome()) {
  document.body.classList.add('linux-chrome')
}

if (shouldUseMacOverlayChrome()) {
  document.body.classList.add('macos-overlay-chrome')
}

applyStoredThemeMode(document, window.localStorage)
const startupAppearance = applyStoredAppearance(document, window.localStorage)
void loadFontAssetsForAppearance(document, startupAppearance)

function dispatchDeterministicShortcutEvent(init: AppCommandShortcutEventInit) {
  const target =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : document.body ?? window

  target.dispatchEvent(new KeyboardEvent('keydown', init))
}

window.__grimoireTest = {
  dispatchAppCommand(id: string) {
    if (!isAppCommandId(id)) {
      throw new Error(`Unknown app command: ${id}`)
    }
    window.dispatchEvent(new CustomEvent(APP_COMMAND_EVENT_NAME, { detail: id }))
  },
  dispatchShortcutEvent(init: AppCommandShortcutEventInit) {
    dispatchDeterministicShortcutEvent(init)
  },
  async triggerMenuCommand(id: string) {
    if (!isNativeMenuCommandId(id)) {
      throw new Error(`Unknown native menu command: ${id}`)
    }

    if ('__TAURI__' in window || '__TAURI_INTERNALS__' in window) {
      const { invoke } = await import('@tauri-apps/api/core')
      return invoke('trigger_menu_command', { id })
    }

    if (!window.__grimoireTest?.dispatchBrowserMenuCommand) {
      throw new Error('Grimoire test bridge is missing dispatchBrowserMenuCommand')
    }

    window.__grimoireTest.dispatchBrowserMenuCommand(id)
    return undefined
  },
  triggerShortcutCommand(id: string, options?: AppCommandShortcutEventOptions) {
    if (!isAppCommandId(id)) {
      throw new Error(`Unknown app command: ${id}`)
    }

    const init = getShortcutEventInit(id, options)
    if (!init) {
      throw new Error(`Command ${id} does not define a keyboard shortcut`)
    }

    dispatchDeterministicShortcutEvent(init)
  },
}

type ReactRootErrorPayload = {
  componentStack: string
}

type ReactRootErrorHandler = (
  error: unknown,
  errorInfo: ReactRootErrorPayload,
) => void

let sentryReactErrorHandler: ReactRootErrorHandler | null = null
let sentryReactErrorHandlerImport: Promise<ReactRootErrorHandler> | null = null

function loadSentryReactErrorHandler(): Promise<ReactRootErrorHandler> {
  sentryReactErrorHandlerImport ??= import('@sentry/react').then((Sentry) => {
    const handler = Sentry.reactErrorHandler()
    sentryReactErrorHandler = handler
    return handler
  })
  return sentryReactErrorHandlerImport
}

function captureReactRootError(
  error: unknown,
  errorInfo: { componentStack?: string },
): void {
  const payload = { componentStack: errorInfo.componentStack ?? '' }
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
    console.error('[react-root]', error, payload)
  }

  if (sentryReactErrorHandler) {
    sentryReactErrorHandler(error, payload)
    return
  }

  void loadSentryReactErrorHandler().then((handler) => handler(error, payload))
}

createRoot(document.getElementById('root')!, {
  onCaughtError: captureReactRootError,
  onUncaughtError: captureReactRootError,
  onRecoverableError: captureReactRootError,
}).render(
  <StrictMode>
    <TooltipProvider>
      <PlatformChrome />
      <App />
    </TooltipProvider>
  </StrictMode>,
)

/**
 * Mock Tauri invoke for browser testing.
 * Browser-only vault fixtures are loaded lazily so the native app shell does
 * not pay for demo content and mock command handlers during startup.
 */

import type { VaultEntry } from '../types'
import { tryVaultApi } from './vault-api'

type MockHandlersModule = typeof import('./mock-handlers')
type MockContentModule = typeof import('./mock-content')
type MockCommandHandler = (args?: Record<string, unknown>) => unknown
type PendingMockEntry = { entry: VaultEntry; content: string }
type MockWindow = Window & {
  __mockContent?: Record<string, string>
  __mockHandlers?: Record<string, MockCommandHandler>
  __mockPendingEntries?: PendingMockEntry[]
  __mockPendingContent?: Record<string, string>
  __mockPendingChangedPaths?: string[]
}

let mockHandlersModule: MockHandlersModule | null = null
let mockHandlersImport: Promise<MockHandlersModule> | null = null
const importBrowserMockFixtures = import.meta.env?.PROD
  ? null
  : () => Promise.all([
      import('./mock-handlers'),
      import('./mock-content'),
    ])

export function isTauri(): boolean {
  if (typeof globalThis !== 'undefined' && typeof (globalThis as { isTauri?: unknown }).isTauri === 'boolean') {
    return Boolean((globalThis as { isTauri?: unknown }).isTauri)
  }

  return typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
}

function getMockWindow(): MockWindow | null {
  return typeof window === 'undefined' ? null : window
}

function applyPendingMockMutations(module: MockHandlersModule): void {
  const mockWindow = getMockWindow()
  if (!mockWindow) return

  for (const { entry, content } of mockWindow.__mockPendingEntries ?? []) {
    module.addMockEntry(entry, content)
  }
  mockWindow.__mockPendingEntries = []

  for (const [path, content] of Object.entries(mockWindow.__mockPendingContent ?? {})) {
    module.updateMockContent(path, content)
  }
  mockWindow.__mockPendingContent = {}

  for (const path of mockWindow.__mockPendingChangedPaths ?? []) {
    module.trackMockChange(path)
  }
  mockWindow.__mockPendingChangedPaths = []
}

function installMockGlobals(module: MockHandlersModule, contentModule: MockContentModule): void {
  const mockWindow = getMockWindow()
  if (!mockWindow) return

  mockWindow.__mockContent = contentModule.MOCK_CONTENT
  mockWindow.__mockHandlers = module.mockHandlers
  applyPendingMockMutations(module)
}

async function loadMockHandlers(): Promise<MockHandlersModule> {
  if (!importBrowserMockFixtures) {
    throw new Error('Mock Tauri handlers are disabled in production builds')
  }
  if (mockHandlersModule) return mockHandlersModule

  mockHandlersImport ??= importBrowserMockFixtures().then(([handlersModule, contentModule]) => {
    mockHandlersModule = handlersModule
    installMockGlobals(handlersModule, contentModule)
    return handlersModule
  })

  return mockHandlersImport
}

function resolveMockHandler(command: string) {
  const mockWindow = getMockWindow()
  if (mockWindow?.__mockHandlers?.[command]) {
    return mockWindow.__mockHandlers[command]
  }
  return mockHandlersModule?.mockHandlers[command]
}

export function addMockEntry(entry: VaultEntry, content: string): void {
  if (mockHandlersModule) {
    mockHandlersModule.addMockEntry(entry, content)
    return
  }

  const mockWindow = getMockWindow()
  if (!mockWindow) return

  mockWindow.__mockContent = { ...mockWindow.__mockContent, [entry.path]: content }
  mockWindow.__mockPendingEntries = [...(mockWindow.__mockPendingEntries ?? []), { entry, content }]
}

export function updateMockContent(path: string, content: string): void {
  if (mockHandlersModule) {
    mockHandlersModule.updateMockContent(path, content)
    return
  }

  const mockWindow = getMockWindow()
  if (!mockWindow) return

  mockWindow.__mockContent = { ...mockWindow.__mockContent, [path]: content }
  mockWindow.__mockPendingContent = { ...mockWindow.__mockPendingContent, [path]: content }
}

export function trackMockChange(path: string): void {
  if (mockHandlersModule) {
    mockHandlersModule.trackMockChange(path)
    return
  }

  const mockWindow = getMockWindow()
  if (!mockWindow) return

  mockWindow.__mockPendingChangedPaths = [...(mockWindow.__mockPendingChangedPaths ?? []), path]
}

export async function mockInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const vaultResult = await tryVaultApi<T>(cmd, args)
  if (vaultResult !== undefined) return vaultResult

  let handler = resolveMockHandler(cmd)
  if (!handler) {
    const module = await loadMockHandlers()
    handler = resolveMockHandler(cmd) ?? module.mockHandlers[cmd]
  }

  if (handler) {
    await new Promise((r) => setTimeout(r, 100))
    return handler(args) as T
  }
  throw new Error(`No mock handler for command: ${cmd}`)
}

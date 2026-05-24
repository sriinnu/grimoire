import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'

const PROJECT_ROOT = resolve(__dirname, '..')
const HEAVY_APP_IMPORTS = [
  './components/AiAgentsOnboardingPrompt',
  './components/CloneVaultModal',
  './components/CommandPalette',
  './components/CommitDialog',
  './components/ConfirmDeleteDialog',
  './components/ConflictResolverModal',
  './components/CreateTypeDialog',
  './components/CreateVaultDialog',
  './components/CreateViewDialog',
  './components/Editor',
  './components/FeedbackDialog',
  './components/GraphModal',
  './components/McpSetupDialog',
  './components/PulseView',
  './components/QuickOpenPalette',
  './components/SearchPanel',
  './components/SettingsPanel',
  './components/TelemetryConsentDialog',
  './components/WeatherSnapshotDialog',
  './components/WelcomeScreen',
]
const COLD_SURFACE_IMPORTS = HEAVY_APP_IMPORTS
  .filter((specifier) => specifier !== './components/Editor')
  .map((specifier) => specifier.replace('./components/', './'))
const COLD_SURFACE_FILES = COLD_SURFACE_IMPORTS.map((specifier) => `src/components/${specifier.slice(2)}.tsx`)
const BROWSER_MOCK_FIXTURE_FILES = [
  'src/mock-tauri/mock-content.ts',
  'src/mock-tauri/mock-entries.ts',
  'src/mock-tauri/mock-handlers.ts',
]
const DND_LAZY_SURFACE_FILES = [
  'src/components/note-list/ListPropertiesSortableOptions.tsx',
  'src/components/sidebar/FavoritesSortableList.tsx',
  'src/components/sidebar/SortableTypesSection.tsx',
]
const STATUS_BAR_COLD_FILES = [
  'src/components/AddRemoteModal.tsx',
  'src/components/ui/action-tooltip.tsx',
  'src/components/ui/tooltip.tsx',
]
const EDITOR_RIGHT_PANEL_COLD_FILES = [
  'src/components/EditorRightPanel.tsx',
  'src/components/AiPanel.tsx',
  'src/components/Inspector.tsx',
]
const RAW_EDITOR_COLD_FILES = [
  'src/components/RawEditorView.tsx',
  'src/hooks/useCodeMirror.ts',
]

function runtimeStaticImports(relativePath: string): string[] {
  const sourceFile = parseSourceFile(relativePath)
  const imports: string[] = []

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return
    if (node.importClause?.isTypeOnly) return
    if (!ts.isStringLiteral(node.moduleSpecifier)) return
    imports.push(node.moduleSpecifier.text)
  })

  return imports
}

function runtimeDynamicImports(relativePath: string): string[] {
  const sourceFile = parseSourceFile(relativePath)
  const imports: string[] = []

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return imports
}

function parseSourceFile(relativePath: string): ts.SourceFile {
  const absolutePath = resolve(PROJECT_ROOT, relativePath)
  const sourceText = readFileSync(absolutePath, 'utf8')
  return ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX)
}

function staticImportGraph(entryPath: string): string[] {
  const visited = new Set<string>()

  function walk(relativePath: string): void {
    if (visited.has(relativePath)) return
    visited.add(relativePath)

    for (const specifier of runtimeStaticImports(relativePath)) {
      const resolved = resolveRelativeModule(relativePath, specifier)
      if (resolved) walk(resolved)
    }
  }

  walk(entryPath)
  return [...visited].sort()
}

function staticImportGraphSpecifiers(entryPath: string): string[] {
  return staticImportGraph(entryPath).flatMap(runtimeStaticImports)
}

function resolveRelativeModule(fromRelativePath: string, specifier: string): string | null {
  if (!specifier.startsWith('.') || specifier.endsWith('.css')) return null
  const fromAbsolutePath = resolve(PROJECT_ROOT, fromRelativePath)
  const candidateBase = resolve(dirname(fromAbsolutePath), specifier)
  for (const candidate of [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}/index.ts`,
    `${candidateBase}/index.tsx`,
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(PROJECT_ROOT, candidate).replace(/\\/g, '/')
    }
  }
  return null
}

describe('startup import budget', () => {
  it('keeps heavyweight app surfaces out of App runtime imports', () => {
    const appImports = runtimeStaticImports('src/App.tsx')

    expect(appImports).not.toEqual(expect.arrayContaining([
      '@tauri-apps/api/core',
      ...HEAVY_APP_IMPORTS,
    ]))
  })

  it('keeps heavyweight app surfaces out of the startup static import graph', () => {
    expect(staticImportGraph('src/main.tsx')).not.toEqual(expect.arrayContaining(COLD_SURFACE_FILES))
  })

  it('keeps cold surfaces behind explicit lazy imports', () => {
    const lazyImports = runtimeDynamicImports('src/components/AppLazySurfaces.tsx')

    expect(lazyImports).toEqual(expect.arrayContaining(COLD_SURFACE_IMPORTS))
    expect(runtimeStaticImports('src/components/AppLazySurfaces.tsx')).toEqual(['react'])
  })

  it('keeps the full icon picker catalog off the saved-icon runtime resolver', () => {
    expect(runtimeStaticImports('src/utils/iconRegistry.ts')).not.toContain('./iconOptions')
    expect(staticImportGraph('src/main.tsx')).not.toContain('src/utils/iconOptions.ts')
  })

  it('keeps the full emoji picker catalog off the saved-icon runtime resolver', () => {
    expect(runtimeStaticImports('src/utils/noteIcon.ts')).toContain('./emojiRuntime')
    expect(runtimeStaticImports('src/utils/noteIcon.ts')).not.toContain('./emoji')
    expect(staticImportGraph('src/main.tsx')).not.toContain('src/utils/emoji.ts')
  })

  it('keeps folder-only project intelligence out of the normal startup graph', () => {
    expect(runtimeStaticImports('src/components/NoteList.tsx')).not.toContain('./ProjectIntelligenceStrip')
    expect(staticImportGraph('src/main.tsx')).not.toContain('src/components/ProjectIntelligenceStrip.tsx')
  })

  it('keeps drag-and-drop libraries behind sortable lazy surfaces', () => {
    const startupFiles = staticImportGraph('src/main.tsx')
    const startupSpecifiers = staticImportGraphSpecifiers('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(DND_LAZY_SURFACE_FILES))
    expect(startupSpecifiers.some((specifier) => specifier.startsWith('@dnd-kit/'))).toBe(false)
  })

  it('keeps Tauri API packages behind the lazy runtime bridge', () => {
    const startupSpecifiers = staticImportGraphSpecifiers('src/main.tsx')

    expect(startupSpecifiers.some((specifier) => specifier.startsWith('@tauri-apps/'))).toBe(false)
    expect(runtimeStaticImports('src/lib/tauriRuntime.ts')).toEqual([])
    expect(runtimeDynamicImports('src/lib/tauriRuntime.ts')).toEqual(expect.arrayContaining([
      '@tauri-apps/api/core',
      '@tauri-apps/api/window',
    ]))
  })

  it('keeps browser mock fixture modules out of the startup static import graph', () => {
    expect(staticImportGraph('src/main.tsx')).not.toEqual(expect.arrayContaining(BROWSER_MOCK_FIXTURE_FILES))
  })

  it('keeps browser mock fixture loading behind the production build gate', () => {
    const mockTauriSource = readFileSync(resolve(PROJECT_ROOT, 'src/mock-tauri/index.ts'), 'utf8')

    expect(mockTauriSource).toContain('const importBrowserMockFixtures = import.meta.env.PROD')
    expect(mockTauriSource).toContain("throw new Error('Mock Tauri handlers are disabled in production builds')")
  })

  it('keeps cold status-bar menus and floating tooltips out of startup', () => {
    const startupFiles = staticImportGraph('src/main.tsx')
    const statusBarSectionImports = runtimeDynamicImports('src/components/status-bar/StatusBarSections.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(STATUS_BAR_COLD_FILES))
    expect(runtimeStaticImports('src/components/status-bar/AiAgentsBadge.tsx')).not.toEqual(expect.arrayContaining([
      '@/components/ui/action-tooltip',
      '@/components/ui/dropdown-menu',
      '@/components/ui/tooltip',
    ]))
    expect(statusBarSectionImports).toEqual(expect.arrayContaining([
      '../AddRemoteModal',
    ]))
  })

  it('keeps the editor right panel behind a session-activated lazy boundary', () => {
    const editorLayoutImports = runtimeDynamicImports('src/components/EditorLayout.tsx')
    const editorFiles = staticImportGraph('src/components/Editor.tsx')

    expect(runtimeStaticImports('src/components/EditorLayout.tsx')).not.toContain('./EditorRightPanel')
    expect(editorFiles).not.toEqual(expect.arrayContaining(EDITOR_RIGHT_PANEL_COLD_FILES))
    expect(editorLayoutImports).toEqual(expect.arrayContaining([
      './EditorRightPanel',
    ]))
  })

  it('keeps raw-mode CodeMirror out of the normal rich-editor graph', () => {
    const editorContentImports = runtimeDynamicImports('src/components/editor-content/EditorContentLayout.tsx')
    const editorFiles = staticImportGraph('src/components/Editor.tsx')
    const editorSpecifiers = staticImportGraphSpecifiers('src/components/Editor.tsx')

    expect(runtimeStaticImports('src/components/editor-content/EditorContentLayout.tsx')).not.toContain('../RawEditorView')
    expect(editorFiles).not.toEqual(expect.arrayContaining(RAW_EDITOR_COLD_FILES))
    expect(editorSpecifiers.some((specifier) => specifier.startsWith('@codemirror/'))).toBe(false)
    expect(editorContentImports).toEqual(expect.arrayContaining([
      '../RawEditorView',
    ]))
  })
})

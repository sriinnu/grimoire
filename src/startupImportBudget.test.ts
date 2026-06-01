import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  runtimeDynamicImports,
  runtimeStaticImports,
  staticImportGraph,
  staticImportGraphSpecifiers,
} from '../scripts/test-utils/startupImportGraph'

const PROJECT_ROOT = resolve(__dirname, '..')
const HEAVY_APP_IMPORTS = [
  './components/AiAgentsOnboardingPrompt',
  './components/AudioRecordingDialog',
  './components/CloneVaultModal',
  './components/CommandPalette',
  './components/CommitDialog',
  './components/ConfirmDeleteDialog',
  './components/ConflictResolverModal',
  './components/CreateTypeDialog',
  './components/CreateVaultDialog',
  './components/CreateViewDialog',
  './components/dashboard/DashboardRoute',
  './components/Editor',
  './components/FeedbackDialog',
  './components/GraphModal',
  './components/McpSetupDialog',
  './components/note-retargeting/NoteRetargetingDialogs',
  './components/PulseView',
  './components/QuickOpenPalette',
  './components/SearchPanel',
  './components/SettingsPanel',
  './components/StatusBar',
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
const NOTE_RETARGETING_COLD_FILES = ['src/components/note-retargeting/NoteRetargetingDialogs.tsx', 'src/components/note-retargeting/RetargetNoteDialog.tsx', 'src/components/ui/dialog.tsx', 'src/components/ui/input.tsx', 'src/components/ui/scroll-area.tsx']
const RARE_NOTICE_COLD_FILES = ['src/components/DeleteProgressNotice.tsx', 'src/components/RenameDetectedBanner.tsx', 'src/components/UpdateBanner.tsx', 'src/components/VaultRebuildProgressNotice.tsx']
const SIDEBAR_TYPE_CUSTOMIZER_COLD_FILES = ['src/components/TypeCustomizePopover.tsx', 'src/components/TypeImagePicker.tsx', 'src/hooks/useIconOptions.ts']
const INTENT_COLD_FILES = ['src/utils/audioTranscription.ts', 'src/lib/transcriptionProviders.ts', 'src/utils/weatherSnapshot.ts']
const NOTE_LIST_PROPERTY_PICKER_COLD_FILES = ['src/components/note-list/ListPropertiesPopover.tsx']
const EDITOR_RIGHT_PANEL_COLD_FILES = [
  'src/components/EditorRightPanel.tsx',
  'src/components/AiPanel.tsx',
  'src/components/Inspector.tsx',
]
const AI_CHAT_RIGHT_PANEL_COLD_FILES = [
  'src/components/AiChatRightPanel.tsx',
  'src/components/AiPanel.tsx',
  'src/components/AiPanelChrome.tsx',
  'src/components/AiPanelIntelligenceRail.tsx',
  'src/components/AiMessage.tsx',
  'src/components/MarkdownContent.tsx',
]
const RAW_EDITOR_COLD_FILES = [
  'src/components/RawEditorView.tsx',
  'src/hooks/useCodeMirror.ts',
]
const RICH_EDITOR_FORMATTING_COLD_FILES = [
  'src/components/GrimoireFormattingToolbarSurface.tsx',
  'src/components/grimoireEditorFormatting.tsx',
]
const DASHBOARD_INSIGHT_COLD_FILES = [
  'src/components/dashboard/DashboardInsightPanels.tsx',
  'src/components/dashboard/DreamForgePanel.tsx',
  'src/components/dashboard/TimeLoomPanel.tsx',
  'src/lib/dreamForge.ts',
  'src/lib/timeLoom.ts',
]
const DASHBOARD_ASK_CONTEXT_COLD_FILES = [
  'src/lib/askContextPackage.ts',
  'src/utils/dashboardAskContext.ts',
]
const DASHBOARD_ROUTE_COLD_FILES = [
  'src/components/dashboard/DashboardTodayRunway.tsx',
  'src/components/dashboard/DashboardRoute.tsx',
  'src/components/dashboard/VaultDashboard.tsx',
  'src/hooks/useDashboardCapture.ts',
  'src/hooks/useVaultPulsePreview.ts',
  'src/utils/dashboardCapture.ts',
  'src/utils/dashboardModel.ts',
]
const ENTITY_RELATIONSHIP_COLD_FILES = ['src/utils/noteRelationships.ts']
const ENTITY_VIEW_COLD_FILES = [
  'src/components/note-list/EntityView.tsx',
  'src/components/note-list/PinnedCard.tsx',
  'src/components/note-list/RelationshipGroupSection.tsx',
]
const FULL_I18N_COLD_FILES = [
  'src/lib/i18n.ts',
  'src/lib/i18nAppearance.ts',
  'src/lib/i18nPortability.ts',
]
const NOTE_LIST_ROUTE_COLD_FILES = [
  'src/components/NoteList.tsx',
  'src/components/note-list/NoteListLayout.tsx',
  'src/components/note-list/NoteListViews.tsx',
]

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
    expect(runtimeStaticImports('src/components/AppLazySurfaces.tsx')).toEqual([
      'react',
      '../hooks/visibleDocument',
    ])
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

  it('keeps the virtualized note-list route behind note-list intent', () => {
    const startupFiles = staticImportGraph('src/main.tsx')
    const startupSpecifiers = staticImportGraphSpecifiers('src/main.tsx')

    expect(runtimeStaticImports('src/App.tsx')).not.toContain('./components/NoteList')
    expect(startupFiles).not.toEqual(expect.arrayContaining(NOTE_LIST_ROUTE_COLD_FILES))
    expect(startupSpecifiers).not.toContain('react-virtuoso')
    expect(runtimeStaticImports('src/components/LazyNoteList.tsx')).toEqual(['react'])
    expect(runtimeDynamicImports('src/components/LazyNoteList.tsx')).toContain('./NoteList')
  })

  it('keeps dashboard ask-context packaging out of the normal startup graph', () => {
    expect(staticImportGraph('src/main.tsx')).not.toEqual(expect.arrayContaining(DASHBOARD_ASK_CONTEXT_COLD_FILES))
    expect(runtimeDynamicImports('src/components/dashboard/VaultDashboard.tsx')).toContain('../../utils/dashboardAskContext')
    expect(runtimeDynamicImports('src/components/dashboard/DashboardQuickCapturePanel.tsx')).toContain('./DashboardAskContextPreview')
    expect(runtimeDynamicImports('src/utils/dashboardCapture.ts')).toContain('./dashboardAskContext')
  })

  it('keeps dashboard route and capture planning out of the normal startup graph', () => {
    const startupFiles = staticImportGraph('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(DASHBOARD_ROUTE_COLD_FILES))
    expect(runtimeDynamicImports('src/components/AppLazySurfaces.tsx')).toContain('./dashboard/DashboardRoute')
    expect(runtimeStaticImports('src/App.tsx')).not.toContain('./hooks/useVaultPulsePreview')
    expect(runtimeStaticImports('src/components/dashboard/DashboardRoute.tsx')).toContain('../../hooks/useVaultPulsePreview')
  })

  it('keeps drag-and-drop libraries behind sortable lazy surfaces', () => {
    const startupFiles = staticImportGraph('src/main.tsx')
    const startupSpecifiers = staticImportGraphSpecifiers('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(DND_LAZY_SURFACE_FILES))
    expect(startupSpecifiers.some((specifier) => specifier.startsWith('@dnd-kit/'))).toBe(false)
  })

  it('keeps the sidebar type customizer behind customize intent', () => {
    expect(staticImportGraph('src/main.tsx')).not.toEqual(expect.arrayContaining(SIDEBAR_TYPE_CUSTOMIZER_COLD_FILES))
    expect(runtimeStaticImports('src/components/sidebar/SidebarSections.tsx')).not.toContain('../TypeCustomizePopover')
    expect(runtimeDynamicImports('src/components/sidebar/SidebarSections.tsx')).toContain('../TypeCustomizePopover')
  })

  it('keeps audio transcription implementation behind transcribe intent', () => {
    expect(staticImportGraph('src/main.tsx')).not.toEqual(expect.arrayContaining(INTENT_COLD_FILES))
    expect(runtimeStaticImports('src/hooks/useAudioTranscription.ts')).not.toContain('../utils/audioTranscription')
    expect(runtimeStaticImports('src/hooks/useSettings.ts')).not.toContain('../lib/transcriptionProviders')
    expect(runtimeStaticImports('src/App.tsx')).not.toContain('./utils/weatherSnapshot')
    expect(runtimeDynamicImports('src/hooks/useAudioTranscription.ts')).toContain('../utils/audioTranscription')
  })

  it('keeps note-list property customization behind column intent', () => {
    expect(staticImportGraph('src/main.tsx')).not.toEqual(expect.arrayContaining(NOTE_LIST_PROPERTY_PICKER_COLD_FILES))
    expect(runtimeStaticImports('src/components/note-list/NoteListHeader.tsx')).not.toContain('./ListPropertiesPopover')
    expect(runtimeDynamicImports('src/components/note-list/NoteListHeader.tsx')).toContain('./ListPropertiesPopover')
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

    expect(mockTauriSource).toContain('const importBrowserMockFixtures = import.meta.env?.PROD')
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

  it('keeps note-retargeting dialogs behind retarget intent', () => {
    const startupFiles = staticImportGraph('src/main.tsx')
    const retargetingImports = runtimeDynamicImports('src/components/note-retargeting/NoteRetargetingDialogs.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(NOTE_RETARGETING_COLD_FILES))
    expect(runtimeStaticImports('src/components/note-retargeting/NoteRetargetingDialogs.tsx')).not.toContain('./RetargetNoteDialog')
    expect(retargetingImports).toContain('./RetargetNoteDialog')
  })

  it('keeps rare app notices behind visible state', () => {
    const startupFiles = staticImportGraph('src/main.tsx')
    const lazySurfaceImports = runtimeDynamicImports('src/components/AppLazySurfaces.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(RARE_NOTICE_COLD_FILES))
    expect(runtimeStaticImports('src/App.tsx')).not.toEqual(expect.arrayContaining([
      './components/DeleteProgressNotice',
      './components/RenameDetectedBanner',
      './components/UpdateBanner',
      './components/VaultRebuildProgressNotice',
    ]))
    expect(lazySurfaceImports).toEqual(expect.arrayContaining([
      './DeleteProgressNotice',
      './RenameDetectedBanner',
      './UpdateBanner',
      './VaultRebuildProgressNotice',
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

  it('keeps the full AI chat surface behind the AI-panel intent boundary', () => {
    const rightPanelFiles = staticImportGraph('src/components/EditorRightPanel.tsx')
    const rightPanelImports = runtimeDynamicImports('src/components/EditorRightPanel.tsx')

    expect(runtimeStaticImports('src/components/EditorRightPanel.tsx')).not.toContain('./AiChatRightPanel')
    expect(rightPanelFiles).not.toEqual(expect.arrayContaining(AI_CHAT_RIGHT_PANEL_COLD_FILES))
    expect(rightPanelImports).toEqual(expect.arrayContaining([
      './AiChatRightPanel',
    ]))
  })

  it('keeps the rich AI Markdown renderer behind response content', () => {
    const aiChatFiles = staticImportGraph('src/components/AiChatRightPanel.tsx')

    expect(runtimeStaticImports('src/components/AiMessage.tsx')).not.toContain('./MarkdownContent')
    expect(aiChatFiles).not.toContain('src/components/MarkdownContent.tsx')
    expect(runtimeDynamicImports('src/components/AiMessage.tsx')).toContain('./MarkdownContent')
  })

  it('keeps Markdown syntax highlighting and diagrams behind fenced code blocks', () => {
    const markdownContentFiles = staticImportGraph('src/components/MarkdownContent.tsx')

    expect(markdownContentFiles).not.toEqual(expect.arrayContaining([
      'src/components/MermaidDiagram.tsx',
      'src/utils/codeLanguageDetection.ts',
    ]))
    expect(runtimeStaticImports('src/components/MarkdownContent.tsx')).not.toEqual(expect.arrayContaining([
      './MermaidDiagram',
      '../utils/codeLanguageDetection',
      'rehype-highlight',
    ]))
    expect(runtimeDynamicImports('src/components/MarkdownContent.tsx')).toContain('./MarkdownContentRich')
    expect(runtimeStaticImports('src/components/MarkdownContentRich.tsx')).toEqual(expect.arrayContaining([
      './MermaidDiagram',
      '../utils/codeLanguageDetection',
      'rehype-highlight',
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

  it('keeps the floating formatting toolbar out of the initial rich-editor graph', () => {
    const editorFiles = staticImportGraph('src/components/Editor.tsx')
    const singleEditorImports = runtimeDynamicImports('src/components/SingleEditorView.tsx')

    expect(runtimeStaticImports('src/components/SingleEditorView.tsx')).not.toContain('./grimoireEditorFormatting')
    expect(editorFiles).not.toEqual(expect.arrayContaining(RICH_EDITOR_FORMATTING_COLD_FILES))
    expect(singleEditorImports).toEqual(expect.arrayContaining([
      './GrimoireFormattingToolbarSurface',
    ]))
  })

  it('keeps dashboard insight panels out of the startup shell', () => {
    const startupFiles = staticImportGraph('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(DASHBOARD_INSIGHT_COLD_FILES))
    expect(runtimeDynamicImports('src/components/dashboard/VaultDashboard.tsx')).toContain('./DashboardInsightPanels')
  })

  it('keeps entity relationship graph building behind entity-view intent', () => {
    const startupFiles = staticImportGraph('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(ENTITY_RELATIONSHIP_COLD_FILES))
    expect(runtimeStaticImports('src/components/note-list/noteListDataHooks.ts')).not.toContain('../../utils/noteRelationships')
    expect(runtimeDynamicImports('src/components/note-list/noteListDataHooks.ts')).toContain('../../utils/noteRelationships')
  })

  it('keeps entity-only note-list rendering behind entity-view intent', () => {
    const startupFiles = staticImportGraph('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(ENTITY_VIEW_COLD_FILES))
    expect(runtimeStaticImports('src/components/note-list/NoteListLayout.tsx')).not.toContain('./EntityView')
    expect(runtimeDynamicImports('src/components/note-list/NoteListLayout.tsx')).toContain('./EntityView')
  })

  it('keeps full Settings translations out of the note-first startup shell', () => {
    const startupFiles = staticImportGraph('src/main.tsx')

    expect(startupFiles).not.toEqual(expect.arrayContaining(FULL_I18N_COLD_FILES))
    expect(runtimeStaticImports('src/App.tsx')).not.toContain('./lib/i18n')
    expect(runtimeStaticImports('src/components/note-list/noteListUtils.ts')).toContain('../../lib/i18nNoteList')
    expect(runtimeStaticImports('src/hooks/commands/settingsCommands.ts')).toContain('../../lib/i18nCommands')
  })
})

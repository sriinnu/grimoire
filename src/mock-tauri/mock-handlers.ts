import type {
  VaultEntry,
  Settings,
  GitAddRemoteResult,
  GitPullResult,
  GitPushResult,
  GitRemoteStatus,
  LastCommitInfo,
  PulseCommit,
} from '../types'
import { MOCK_CONTENT } from './mock-content'
import { MOCK_ENTRIES } from './mock-entries'
import {
  commitMockChanges,
  getMockModifiedFiles,
  mockFileDiff,
  mockFileDiffAtCommit,
  mockFileHistory,
  trackMockChange as trackMockGitChange,
} from './mock-git-handlers'
import { getMockVaultAiGuidanceStatus, restoreMockVaultAiGuidance } from './mock-guidance-state'
import {
  handleMoveNoteToFolder,
  handleRenameNote,
  handleRenameNoteFilename,
} from './mock-rename-handlers'
import {
  mockAzureProviderSyncReport,
  mockAzureLivePreflightReport,
  mockDesktopStorageHealthReport,
  mockObjectStorageReport,
  mockS3LivePreflightReport,
  mockS3ProviderSyncReport,
} from './mock-object-storage-handlers'
import { mockImportHandlers } from './mock-import-handlers'
import { mockExportHandlers } from './mock-export-handlers'

function syncWindowContent(): void {
  if (typeof window !== 'undefined') {
    window.__mockContent = MOCK_CONTENT
  }
}

let mockSettings: Settings = {
  auto_pull_interval_minutes: 5,
  autogit_enabled: false,
  autogit_idle_threshold_seconds: 90,
  autogit_inactive_threshold_seconds: 30,
  auto_advance_inbox_after_organize: false,
  telemetry_consent: false,
  crash_reporting_enabled: null,
  analytics_enabled: null,
  anonymous_id: null,
  release_channel: null,
  theme_mode: null,
  theme_preset: null,
  editor_font: null,
  editor_line_height: null,
  ui_language: null,
  menu_bar_icon_enabled: false,
  default_ai_agent: 'claude_code',
  ai_agent_models: null,
  ai_agent_providers: null,
  transcription_provider: 'local_whisper',
  cloud_transcription_enabled: false,
}

const MOCK_AI_PROVIDER_KEYS = [
  { provider_id: 'anthropic', label: 'Anthropic', env_var: 'ANTHROPIC_API_KEY' },
  { provider_id: 'openai', label: 'OpenAI', env_var: 'OPENAI_API_KEY' },
  { provider_id: 'openrouter', label: 'OpenRouter', env_var: 'OPENROUTER_API_KEY' },
  { provider_id: 'deepseek', label: 'DeepSeek', env_var: 'DEEPSEEK_API_KEY' },
  { provider_id: 'gemini', label: 'Gemini', env_var: 'GEMINI_API_KEY' },
  { provider_id: 'google', label: 'Google AI', env_var: 'GOOGLE_API_KEY' },
  { provider_id: 'groq', label: 'Groq', env_var: 'GROQ_API_KEY' },
  { provider_id: 'xai', label: 'xAI', env_var: 'XAI_API_KEY' },
] as const

const mockConfiguredAiProviderKeys = new Set<string>()

function getMockAiProviderKeyStatuses() {
  return MOCK_AI_PROVIDER_KEYS.map((provider) => ({
    ...provider,
    configured: mockConfiguredAiProviderKeys.has(provider.provider_id),
    source: mockConfiguredAiProviderKeys.has(provider.provider_id) ? 'keychain' : 'missing',
  }))
}

function saveMockAiProviderApiKey(args: { providerId?: string; provider_id?: string }) {
  const providerId = args.providerId ?? args.provider_id
  if (providerId) mockConfiguredAiProviderKeys.add(providerId)
  return getMockAiProviderKeyStatuses()
}

function clearMockAiProviderApiKey(args: { providerId?: string; provider_id?: string }) {
  const providerId = args.providerId ?? args.provider_id
  if (providerId) mockConfiguredAiProviderKeys.delete(providerId)
  return getMockAiProviderKeyStatuses()
}

const DEFAULT_MOCK_VAULT_PATH = '/Users/mock/demo-vault-v2'
const DEFAULT_MOCK_VAULT = {
  id: null,
  label: 'demo-vault-v2',
  path: DEFAULT_MOCK_VAULT_PATH,
  storage_provider: 'local-folder',
  sync_provider: 'git',
}

let mockLastVaultPath: string | null = DEFAULT_MOCK_VAULT_PATH
const mockRemoteStateByVault: Record<string, boolean> = {
  [DEFAULT_MOCK_VAULT_PATH]: true,
}
const mockGitStateByVault: Record<string, boolean> = {
  [DEFAULT_MOCK_VAULT_PATH]: true,
}

let mockVaultList: {
  vaults: Array<{
    id?: string | null
    label: string
    path: string
    storage_provider?: string
    sync_provider?: string
  }>
  active_vault: string | null
  hidden_defaults: string[]
} = {
  vaults: [DEFAULT_MOCK_VAULT],
  active_vault: DEFAULT_MOCK_VAULT_PATH,
  hidden_defaults: [],
}

function normalizeMockVaultPath(path: string | null | undefined): string | null {
  const trimmed = path?.trim()
  return trimmed ? trimmed : null
}

function setMockRemoteState(path: string | null | undefined, hasRemote: boolean): void {
  const normalizedPath = normalizeMockVaultPath(path)
  if (!normalizedPath) return
  mockRemoteStateByVault[normalizedPath] = hasRemote
}

function setMockGitState(path: string | null | undefined, isGitRepo: boolean): void {
  const normalizedPath = normalizeMockVaultPath(path)
  if (!normalizedPath) return
  mockGitStateByVault[normalizedPath] = isGitRepo
}

function getMockRemoteState(path: string | null | undefined): boolean {
  const normalizedPath = normalizeMockVaultPath(path)
  if (!normalizedPath) return true
  return mockRemoteStateByVault[normalizedPath] ?? true
}

function getMockGitState(path: string | null | undefined): boolean {
  const normalizedPath = normalizeMockVaultPath(path)
  if (!normalizedPath) return true
  return mockGitStateByVault[normalizedPath] ?? true
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock handler map accepts heterogeneous arg types
export const mockHandlers: Record<string, (args: any) => any> = {
  list_vault: () => MOCK_ENTRIES,
  list_vault_folders: () => [],
  list_views: () => [],
  save_view_cmd: () => {},
  delete_view_cmd: () => {},
  reload_vault: () => MOCK_ENTRIES,
  reload_vault_entry: (args: { path: string }) => MOCK_ENTRIES.find(e => e.path === args.path) ?? { path: args.path, title: 'Unknown', filename: 'unknown.md', aliases: [], belongsTo: [], relatedTo: [], archived: false, snippet: '', wordCount: 0, fileSize: 0, relationships: {}, outgoingLinks: [], properties: {} },
  sync_note_title: () => false,
  get_note_content: (args: { path: string }) => MOCK_CONTENT[args.path] ?? '',
  get_all_content: () => MOCK_CONTENT,
  get_file_history: (args: { path: string }) => mockFileHistory(args.path),
  get_modified_files: () => getMockModifiedFiles(),
  get_file_diff: (args: { path: string }) => mockFileDiff(args.path),
  get_file_diff_at_commit: (args: { path: string; commitHash: string }) => mockFileDiffAtCommit(args.path, args.commitHash),
  git_discard_file: () => {},
  git_commit: (args: { message: string }) => commitMockChanges(args.message),
  get_build_number: () => 'bDEV',
  get_last_commit_info: (): LastCommitInfo => ({ shortHash: 'a1b2c3d', commitUrl: 'https://github.com/sriinnu/grimoire-vault/commit/a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0' }),
  git_pull: (): GitPullResult => ({ status: 'up_to_date', message: 'Already up to date', updatedFiles: [], conflictFiles: [] }),
  git_push: (): GitPushResult => ({ status: 'ok', message: 'Pushed to remote' }),
  is_git_repo: (args?: { vaultPath?: string; vault_path?: string }): boolean => {
    const vaultPath = args?.vaultPath ?? args?.vault_path ?? mockLastVaultPath ?? DEFAULT_MOCK_VAULT_PATH
    return getMockGitState(vaultPath)
  },
  init_git_repo: (args?: { vaultPath?: string; vault_path?: string }) => {
    const vaultPath = args?.vaultPath ?? args?.vault_path ?? mockLastVaultPath ?? DEFAULT_MOCK_VAULT_PATH
    setMockGitState(vaultPath, true)
    setMockRemoteState(vaultPath, false)
    return null
  },
  git_remote_status: (args?: { vaultPath?: string; vault_path?: string }): GitRemoteStatus => {
    const vaultPath = args?.vaultPath ?? args?.vault_path ?? mockLastVaultPath ?? DEFAULT_MOCK_VAULT_PATH
    return { branch: 'main', ahead: 0, behind: 0, hasRemote: getMockRemoteState(vaultPath) }
  },
  git_add_remote: (args?: {
    request?: { vaultPath?: string; vault_path?: string; remoteUrl?: string }
    vaultPath?: string
    vault_path?: string
    remoteUrl?: string
  }): GitAddRemoteResult => {
    const request = args?.request ?? args ?? {}
    const vaultPath = request.vaultPath ?? request.vault_path ?? mockLastVaultPath ?? DEFAULT_MOCK_VAULT_PATH
    setMockRemoteState(vaultPath, true)
    return {
      status: 'connected',
      message: 'Remote connected. This vault now tracks origin/main.',
    }
  },
  get_vault_pulse: (args: { limit?: number }): PulseCommit[] => {
    const limit = args.limit ?? 30
    const ts = Math.floor(Date.now() / 1000)
    const commits: PulseCommit[] = [
      { hash: 'a1b2c3d4e5f6', shortHash: 'a1b2c3d', message: 'Update project notes and add new experiment', date: ts - 3600, githubUrl: 'https://github.com/sriinnu/grimoire-vault/commit/a1b2c3d4e5f6', files: [{ path: '26q1-grimoire-app.md', status: 'modified', title: '26q1 grimoire app' }, { path: 'ai-search.md', status: 'added', title: 'ai search' }], added: 1, modified: 1, deleted: 0 },
      { hash: 'b2c3d4e5f6g7', shortHash: 'b2c3d4e', message: 'Reorganize people notes', date: ts - 86400, githubUrl: 'https://github.com/sriinnu/grimoire-vault/commit/b2c3d4e5f6g7', files: [{ path: 'alice-johnson.md', status: 'modified', title: 'alice johnson' }, { path: 'bob-smith.md', status: 'modified', title: 'bob smith' }, { path: 'old-contact.md', status: 'deleted', title: 'old contact' }], added: 0, modified: 2, deleted: 1 },
      { hash: 'c3d4e5f6g7h8', shortHash: 'c3d4e5f', message: 'Add daily journal entry', date: ts - 172800, githubUrl: null, files: [{ path: '2026-03-03.md', status: 'added', title: '2026 03 03' }], added: 1, modified: 0, deleted: 0 },
    ]
    return commits.slice(0, limit)
  },
  get_conflict_files: (): string[] => [],
  get_conflict_mode: () => 'none',
  check_claude_cli: () => ({ installed: true, version: 'mock' }),
  get_ai_agents_status: () => ({
    claude_code: { installed: true, version: 'mock' },
    codex: { installed: true, version: 'mock' },
    chitragupta: { installed: true, version: 'mock' },
  }),
  get_ai_provider_key_statuses: () => getMockAiProviderKeyStatuses(),
  save_ai_provider_api_key: saveMockAiProviderApiKey,
  clear_ai_provider_api_key: clearMockAiProviderApiKey,
  get_vault_ai_guidance_status: () => getMockVaultAiGuidanceStatus(),
  restore_vault_ai_guidance: () => restoreMockVaultAiGuidance(),
  stream_claude_chat: () => 'mock-session',
  stream_claude_agent: () => null,
  stream_ai_agent: () => null,
  get_transcription_readiness: (args: { provider?: string }) => ({
    provider: args.provider ?? 'local_whisper',
    ready: true,
    status: 'ready',
    message: 'Mock local transcription is ready.',
    cliPath: '/mock/bin/whisper-cli',
    modelPath: '/mock/models/ggml-base.en.bin',
    recommendedModelPath: '/mock/models/ggml-base.en.bin',
    downloadUrl: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin',
    installHint: 'Mock whisper.cpp runtime.',
  }),
  transcribe_audio: (args: { audioPath?: string; audio_path?: string; provider?: string; allowCloud?: boolean; allow_cloud?: boolean }) => {
    const audioPath = args.audioPath ?? args.audio_path ?? '/tmp/voice-note.m4a'
    const provider = args.provider ?? 'local_whisper'
    const allowCloud = args.allowCloud ?? args.allow_cloud ?? false
    if (provider === 'whisper_api' && !allowCloud) {
      throw new Error('Cloud transcription is disabled. Enable it in Settings before using Whisper API.')
    }
    const title = audioPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'voice-note'
    return {
      title: `Transcript - ${title}`,
      audioPath,
      provider,
      language: 'en',
      transcript: 'Mock transcript from local Whisper.',
      segments: [
        { startSeconds: 0, endSeconds: 8, text: 'Mock transcript from local Whisper.' },
      ],
    }
  },
  ...mockImportHandlers,
  ...mockExportHandlers,
  storage_s3_live_preflight: (args: { bucket?: string | null; region?: string | null; prefix?: string | null }) =>
    mockS3LivePreflightReport(args),
  storage_s3_provider_push_preview: (args: { vaultPath?: string; bucket?: string | null; region?: string | null; prefix?: string | null }) =>
    mockS3ProviderSyncReport({ ...args, direction: 'push' }, false),
  storage_s3_provider_pull_preview: (args: { vaultPath?: string; bucket?: string | null; region?: string | null; prefix?: string | null }) =>
    mockS3ProviderSyncReport({ ...args, direction: 'pull' }, false),
  storage_s3_provider_sync_apply: (args: { vaultPath?: string; bucket?: string | null; region?: string | null; prefix?: string | null; direction?: 'push' | 'pull'; previewSignature?: string }) =>
    mockS3ProviderSyncReport(args, true),
  storage_azure_live_preflight: (args: { account?: string | null; container?: string | null; prefix?: string | null }) =>
    mockAzureLivePreflightReport(args),
  storage_azure_provider_push_preview: (args: { vaultPath?: string; account?: string | null; container?: string | null; prefix?: string | null }) =>
    mockAzureProviderSyncReport({ ...args, direction: 'push' }, false),
  storage_azure_provider_pull_preview: (args: { vaultPath?: string; account?: string | null; container?: string | null; prefix?: string | null }) =>
    mockAzureProviderSyncReport({ ...args, direction: 'pull' }, false),
  storage_azure_provider_sync_apply: (args: { vaultPath?: string; account?: string | null; container?: string | null; prefix?: string | null; direction?: 'push' | 'pull'; previewSignature?: string }) =>
    mockAzureProviderSyncReport(args, true),
  storage_desktop_provider_health_check: (args: { vaultPath?: string; providerId?: 'icloud-drive' | 'google-drive-desktop' }) =>
    mockDesktopStorageHealthReport(args),
  storage_push_preview: (args: { vaultPath?: string; mirrorPath?: string; providerId?: string }) =>
    mockObjectStorageReport({ ...args, direction: 'push' }, false),
  storage_pull_preview: (args: { vaultPath?: string; mirrorPath?: string; providerId?: string }) =>
    mockObjectStorageReport({ ...args, direction: 'pull' }, false),
  storage_sync_apply: (args: { vaultPath?: string; mirrorPath?: string; providerId?: string; direction?: 'push' | 'pull'; previewSignature?: string }) =>
    mockObjectStorageReport(args, true),
  save_note_content: (args: { path: string; content: string }) => {
    MOCK_CONTENT[args.path] = args.content
    trackMockGitChange(args.path)
    syncWindowContent()
    return null
  },
  save_image: (args: { vault_path?: string; filename: string; data: string }) => {
    const vault = args.vault_path ?? '/Users/mock/Grimoire'
    return `${vault}/attachments/${Date.now()}-${args.filename}`
  },
  save_audio_recording: (args: { vault_path?: string; vaultPath?: string; filename: string; data: string }) => {
    const vault = args.vault_path ?? args.vaultPath ?? '/Users/mock/Grimoire'
    return `${vault}/Private/attachments/recordings/${Date.now()}-${args.filename}`
  },
  save_canvas_preview: () => null,
  copy_image_to_vault: (args: { vault_path?: string; source_path: string }) => {
    const vault = args.vault_path ?? '/Users/mock/Grimoire'
    const filename = args.source_path.split('/').pop() ?? 'image.png'
    return `${vault}/attachments/${Date.now()}-${filename}`
  },
  get_settings: () => ({ ...mockSettings }),
  save_settings: (args: { settings: Settings }) => {
    const s = args.settings
    mockSettings = {
      auto_pull_interval_minutes: s.auto_pull_interval_minutes ?? 5,
      autogit_enabled: s.autogit_enabled ?? false,
      autogit_idle_threshold_seconds: s.autogit_idle_threshold_seconds ?? 90,
      autogit_inactive_threshold_seconds: s.autogit_inactive_threshold_seconds ?? 30,
      auto_advance_inbox_after_organize: s.auto_advance_inbox_after_organize ?? false,
      telemetry_consent: s.telemetry_consent,
      crash_reporting_enabled: s.crash_reporting_enabled,
      analytics_enabled: s.analytics_enabled,
      anonymous_id: s.anonymous_id,
      release_channel: s.release_channel,
      theme_mode: s.theme_mode ?? null,
      theme_preset: s.theme_preset ?? null,
      editor_font: s.editor_font ?? null,
      editor_line_height: s.editor_line_height ?? null,
      ui_language: s.ui_language ?? null,
      menu_bar_icon_enabled: s.menu_bar_icon_enabled ?? false,
      default_ai_agent: s.default_ai_agent ?? null,
      ai_agent_models: s.ai_agent_models ?? null,
      ai_agent_providers: s.ai_agent_providers ?? null,
      transcription_provider: s.transcription_provider ?? 'local_whisper',
      cloud_transcription_enabled: s.cloud_transcription_enabled ?? false,
    }
    return null
  },
  load_vault_list: () => ({ ...mockVaultList, vaults: [...mockVaultList.vaults] }),
  save_vault_list: (args: { list: typeof mockVaultList }) => { mockVaultList = { ...args.list }; return null },
  rename_note: handleRenameNote,
  rename_note_filename: handleRenameNoteFilename,
  move_note_to_folder: handleMoveNoteToFolder,
  clone_repo: (args: { url: string; localPath?: string; local_path?: string }) => {
    const localPath = args.localPath ?? args.local_path ?? ''
    setMockGitState(localPath, true)
    setMockRemoteState(localPath, true)
    return `Cloned to ${localPath}`
  },
  clone_git_repo: (args: { url: string; localPath?: string; local_path?: string }) => {
    const localPath = args.localPath ?? args.local_path ?? ''
    setMockGitState(localPath, true)
    setMockRemoteState(localPath, true)
    return `Cloned to ${localPath}`
  },
  purge_trash: () => [],
  delete_note: (args: { path: string }) => args.path,
  batch_delete_notes: (args: { paths: string[] }) => args.paths,
  empty_trash: () => [],
  migrate_is_a_to_type: () => 0,
  batch_archive_notes: (args: { paths: string[] }) => args.paths.length,
  batch_trash_notes: (args: { paths: string[] }) => args.paths.length,
  search_vault: (args: { query: string; mode: string }) => {
    const q = (args.query ?? '').toLowerCase()
    if (!q) return { results: [], elapsed_ms: 0, query: q, mode: args.mode }
    const matches = MOCK_ENTRIES
      .filter(e => {
        const content = MOCK_CONTENT[e.path] ?? ''
        return e.title.toLowerCase().includes(q) || content.toLowerCase().includes(q)
      })
      .slice(0, 20)
      .map((e, i) => ({
        title: e.title,
        path: e.path,
        snippet: e.snippet || '',
        score: 1.0 - i * 0.05,
        note_type: e.isA,
      }))
    return { results: matches, elapsed_ms: 42, query: q, mode: args.mode }
  },
  get_last_vault_path: () => mockLastVaultPath,
  set_last_vault_path: (args: { path: string }) => { mockLastVaultPath = args.path; return null },
  get_default_vault_path: () => '/Users/mock/Documents/Getting Started',
  check_vault_exists: (args: { path: string }) => {
    // In mock mode, the demo-vault-v2 path always "exists"
    return args.path.includes('demo-vault-v2')
  },
  create_empty_vault: (args: {
    targetPath?: string
    target_path?: string
    initializeGit?: boolean
    initialize_git?: boolean
    templateKind?: string
    template_kind?: string
  }) => {
    const targetPath = args.targetPath || args.target_path || '/Users/mock/Documents/My Vault'
    setMockGitState(targetPath, Boolean(args.initializeGit ?? args.initialize_git))
    setMockRemoteState(targetPath, false)
    return targetPath
  },
  create_getting_started_vault: (args: { targetPath?: string | null }) => {
    const targetPath = args.targetPath || '/Users/mock/Documents/Getting Started'
    setMockGitState(targetPath, false)
    setMockRemoteState(targetPath, false)
    return targetPath
  },
  register_mcp_tools: () => 'registered',
  check_mcp_status: () => 'installed',
  repair_vault: (): string => {
    restoreMockVaultAiGuidance()
    return 'Vault repaired'
  },
  reinit_telemetry: (): null => null,
}

export function addMockEntry(_entry: VaultEntry, content: string): void {
  if (!MOCK_ENTRIES.some((entry) => entry.path === _entry.path)) {
    MOCK_ENTRIES.push(_entry)
  }
  MOCK_CONTENT[_entry.path] = content
  syncWindowContent()
}

export function updateMockContent(path: string, content: string): void {
  MOCK_CONTENT[path] = content
  syncWindowContent()
}

export function trackMockChange(path: string): void {
  trackMockGitChange(path)
}

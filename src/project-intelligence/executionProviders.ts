export type ProjectExecutionProvider =
  | 'codex'
  | 'claude_code'
  | 'gemini_cli'
  | 'aider'
  | 'opencode'
  | 'chitragupta'

export interface ProjectExecutionProviderStatus {
  /** Stable provider identifier. */
  id: ProjectExecutionProvider
  /** Human-readable label shown in Grimoire. */
  label: string
  /** Whether the provider command is reachable according to caller input. */
  available: boolean
  /** Small operator-facing hint for the provider. */
  hint: string
  /** Command candidates checked for local discovery. */
  commands: string[]
  /** Whether Grimoire should eventually allow direct dispatch to this lane. */
  supportsDispatch: boolean
}

interface ProjectExecutionProviderDefinition {
  id: ProjectExecutionProvider
  label: string
  hint: string
  commands: string[]
  supportsDispatch: boolean
}

const PROJECT_EXECUTION_PROVIDER_DEFINITIONS: readonly ProjectExecutionProviderDefinition[] = [
  {
    id: 'codex',
    label: 'OpenAI Codex',
    hint: 'Best for repo-grounded implementation, patching, tests, and code review loops.',
    commands: ['codex'],
    supportsDispatch: true,
  },
  {
    id: 'claude_code',
    label: 'Claude Code',
    hint: 'Useful for broad codebase analysis, refactors, and high-context execution loops.',
    commands: ['claude', 'claude-code'],
    supportsDispatch: true,
  },
  {
    id: 'gemini_cli',
    label: 'Gemini CLI',
    hint: 'A separate Google-aligned coding lane for comparison and review.',
    commands: ['gemini', 'gemini-cli'],
    supportsDispatch: true,
  },
  {
    id: 'aider',
    label: 'Aider',
    hint: 'Strong for local multi-file edits and terminal-driven pair programming.',
    commands: ['aider'],
    supportsDispatch: false,
  },
  {
    id: 'opencode',
    label: 'OpenCode',
    hint: 'Alternate local code-agent workflow where OpenCode is installed.',
    commands: ['opencode'],
    supportsDispatch: false,
  },
  {
    id: 'chitragupta',
    label: 'Chitragupta',
    hint: 'Local memory and daemon lane for Grimoire-aware context continuity.',
    commands: ['chitragupta', 'chitragupta-daemon'],
    supportsDispatch: true,
  },
]

/**
 * Lists project execution providers using caller-supplied command availability.
 * Tauri/Rust owns PATH probing; this module stays portable and deterministic.
 */
export function listProjectExecutionProviders(
  availableCommands: Iterable<string> = [],
): ProjectExecutionProviderStatus[] {
  const available = new Set(Array.from(availableCommands, (command) => command.toLowerCase()))

  return PROJECT_EXECUTION_PROVIDER_DEFINITIONS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    hint: provider.hint,
    commands: [...provider.commands],
    supportsDispatch: provider.supportsDispatch,
    available: provider.commands.some((command) => available.has(command.toLowerCase())),
  }))
}

/**
 * Looks up one execution provider from the imported registry.
 */
export function getProjectExecutionProvider(
  id: ProjectExecutionProvider,
  availableCommands: Iterable<string> = [],
): ProjectExecutionProviderStatus | null {
  return listProjectExecutionProviders(availableCommands).find((provider) => provider.id === id) ?? null
}

/**
 * Validates a raw provider token from UI, storage, or future Tauri commands.
 */
export function normalizeProjectExecutionProvider(
  value: string | undefined,
): ProjectExecutionProvider | null {
  return PROJECT_EXECUTION_PROVIDER_DEFINITIONS.some((provider) => provider.id === value)
    ? (value as ProjectExecutionProvider)
    : null
}


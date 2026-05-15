/**
 * AI Agent utilities — Claude CLI agent mode with full shell access + MCP vault tools.
 *
 * The agent has full native tool access (bash, read, write, edit) plus
 * Grimoire-specific MCP tools (search_notes, get_vault_context, get_note, open_note).
 * The frontend receives streaming events for text, tool calls, and completion.
 */

import { isTauri } from '../mock-tauri'
import { liveAiNativeAppRequiredMessage } from './liveAiRuntime'

// --- Agent system prompt ---

const AGENT_SYSTEM_PREAMBLE = `You are working inside Grimoire, a personal knowledge management app.

Notes are markdown files with YAML frontmatter. Standard fields: title, type (aliased is_a), date, tags.
You have full shell access. Use bash for file operations, search, bulk edits.
Use the provided MCP tools for: full-text search (search_notes), vault orientation (get_vault_context), parsed note reading (get_note), and opening notes in the UI (open_note).
You are one agent inside Grimoire's agent-of-agents layer. Treat the vault as sovereign local memory, not as disposable remote context.
Never read, summarize, export, sync, upload, or transmit notes marked local-only, or notes under Journal, Journals, Dream, Dreams, Private, Health, or Therapy lanes, unless the user explicitly authorizes that exact action in this conversation.

When you create or edit a note, call open_note(path) so the user sees it in Grimoire.
When you mention or reference a note by name, always use [[Note Title]] wikilink syntax so the user can click to open it.
Be concise and helpful. When you've completed a task, briefly summarize what you did.`

export function buildAgentSystemPrompt(vaultContext?: string): string {
  if (!vaultContext) return AGENT_SYSTEM_PREAMBLE
  return `${AGENT_SYSTEM_PREAMBLE}\n\nVault context:\n${vaultContext}`
}

// --- Claude CLI agent streaming ---

type ClaudeAgentStreamEvent =
  | { kind: 'Init'; session_id: string }
  | { kind: 'TextDelta'; text: string }
  | { kind: 'ThinkingDelta'; text: string }
  | { kind: 'ToolStart'; tool_name: string; tool_id: string; input?: string }
  | { kind: 'ToolDone'; tool_id: string; output?: string }
  | { kind: 'Result'; text: string; session_id: string }
  | { kind: 'Error'; message: string }
  | { kind: 'Done' }

export interface AgentStreamCallbacks {
  onText: (text: string) => void
  onThinking: (text: string) => void
  onToolStart: (toolName: string, toolId: string, input?: string) => void
  onToolDone: (toolId: string, output?: string) => void
  onError: (message: string) => void
  onDone: () => void
}

/**
 * Stream an agent task through the Claude CLI subprocess with full tool access.
 * The CLI handles the tool-use loop; we receive events for UI updates.
 */
export async function streamClaudeAgent(
  message: string,
  systemPrompt: string | undefined,
  vaultPath: string,
  callbacks: AgentStreamCallbacks,
): Promise<void> {
  if (!isTauri()) {
    callbacks.onError(liveAiNativeAppRequiredMessage('claude_code'))
    callbacks.onDone()
    return
  }

  const { invoke } = await import('@tauri-apps/api/core')
  const { listen } = await import('@tauri-apps/api/event')

  const unlisten = await listen<ClaudeAgentStreamEvent>('claude-agent-stream', (event) => {
    const data = event.payload
    switch (data.kind) {
      case 'TextDelta':
        callbacks.onText(data.text)
        break
      case 'ThinkingDelta':
        callbacks.onThinking(data.text)
        break
      case 'ToolStart':
        callbacks.onToolStart(data.tool_name, data.tool_id, data.input)
        break
      case 'ToolDone':
        callbacks.onToolDone(data.tool_id, data.output)
        break
      case 'Error':
        callbacks.onError(data.message)
        break
      case 'Done':
        callbacks.onDone()
        break
    }
  })

  try {
    await invoke<string>('stream_claude_agent', {
      request: {
        message,
        system_prompt: systemPrompt || null,
        vault_path: vaultPath,
      },
    })
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err))
    callbacks.onDone()
  } finally {
    unlisten()
  }
}

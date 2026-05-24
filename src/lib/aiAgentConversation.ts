import type { Dispatch, SetStateAction } from 'react'
import type { AiAction } from '../components/AiMessage'
import type { AskContextPackage } from './askContextPackage'
import { buildAgentSystemPrompt } from '../utils/ai-agent'
import {
  MAX_HISTORY_TOKENS,
  formatMessageWithHistory,
  nextMessageId,
  trimHistory,
  type ChatMessage,
} from '../utils/ai-chat'
import type { NoteReference } from '../utils/ai-context'
import type { AiAgentId } from './aiAgents'
import {
  AI_AGENT_CLI_DEFAULT_ROUTE,
  getAiAgentDefinition,
  supportsAiAgentProviderRoute,
} from './aiAgents'

export interface AiAgentMessage {
  contextPackage?: AskContextPackage
  userMessage: string
  references?: NoteReference[]
  reasoning?: string
  reasoningDone?: boolean
  actions: AiAction[]
  response?: string
  isStreaming?: boolean
  isQueued?: boolean
  id?: string
}

export interface AgentExecutionContext {
  agent: AiAgentId
  ready: boolean
  vaultPath: string
  systemPromptOverride?: string
  provider?: string | null
  model?: string | null
}

export interface PendingUserPrompt {
  contextPackage?: AskContextPackage
  text: string
  references?: NoteReference[]
  queuedMessageId?: string
}

function toChatHistory(messages: AiAgentMessage[]): ChatMessage[] {
  return messages.flatMap((message) => {
    const history: ChatMessage[] = [{ role: 'user', content: message.userMessage, id: message.id ?? '' }]
    if (message.response) {
      history.push({ role: 'assistant', content: message.response, id: `${message.id}-resp` })
    }
    return history
  })
}

function promptWithReferences(prompt: PendingUserPrompt): string {
  const references = prompt.references ?? []
  const contextPackage = prompt.contextPackage
  if (references.length === 0 && !contextPackage) return prompt.text

  const referenceLines = references.map((reference) => {
    const type = reference.type ?? 'Note'
    return `- [[${reference.title}]] (type: ${type}, path: ${reference.path})`
  })
  const contextPackageLines = contextPackage ? askContextPackageLines(contextPackage) : []
  return [
    prompt.text,
    '',
    ...contextPackageLines,
    ...(referenceLines.length > 0 ? ['## Selected Grimoire References', ...referenceLines] : []),
    '',
    'Use these local vault references as context. Read note bodies only through Grimoire tools and keep local-only material withheld.',
  ].join('\n')
}

export function createMissingAgentResponse(agent: AiAgentId): string {
  const definition = getAiAgentDefinition(agent)
  return `${definition.label} is not available on this machine. Install it or switch the default AI agent in Settings.`
}

export function appendLocalResponse(
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>,
  prompt: PendingUserPrompt,
  response: string,
): void {
  setMessages((current) => [
    ...current,
    {
      userMessage: prompt.text,
      references: prompt.references,
      ...messageContext(prompt),
      actions: [],
      response,
      id: nextMessageId(),
    },
  ])
}

export function appendStreamingMessage(
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>,
  prompt: PendingUserPrompt,
): string {
  const messageId = prompt.queuedMessageId ?? nextMessageId()
  const streamingMessage: AiAgentMessage = {
    userMessage: prompt.text,
    references: prompt.references,
    ...messageContext(prompt),
    actions: [],
    isStreaming: true,
    id: messageId,
  }

  setMessages((current) => {
    const queuedIndex = current.findIndex((message) => (
      message.id === messageId && message.isQueued
    ))
    if (queuedIndex === -1) return [...current, streamingMessage]

    const next = [...current]
    next[queuedIndex] = streamingMessage
    return next
  })
  return messageId
}

/** Appends a visible queued user prompt while another agent response is active. */
export function appendQueuedMessage(
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>,
  prompt: PendingUserPrompt,
): string {
  const messageId = nextMessageId()
  setMessages((current) => [
    ...current,
    {
      userMessage: prompt.text,
      references: prompt.references,
      ...messageContext(prompt),
      actions: [],
      isQueued: true,
      id: messageId,
    },
  ])
  return messageId
}

function messageContext(prompt: PendingUserPrompt): Pick<AiAgentMessage, 'contextPackage'> {
  return prompt.contextPackage ? { contextPackage: prompt.contextPackage } : {}
}

function askContextPackageLines(contextPackage: AskContextPackage): string[] {
  if (contextPackage.kind === 'graph-council') return graphContextPackageLines(contextPackage)

  const memoryLines = contextPackage.memoryReferences.map((memory) => {
    const confidence = memory.confidence ? `, confidence: ${memory.confidence}` : ''
    return `- [[${memory.title}]] (path: ${memory.path}${confidence})`
  })
  return [
    '## Grimoire Ask Context Package',
    `Origin: ${contextPackage.kind}`,
    `Visible public notes: ${contextPackage.references.length} of ${contextPackage.visibleCount}`,
    `Withheld: ${contextPackage.withheld.protectedNotes} protected notes, ${contextPackage.withheld.protectedMemories} protected memories`,
    contextPackage.sourceLabels.length > 0
      ? `Source labels: ${contextPackage.sourceLabels.map((label) => `[[${label}]]`).join(', ')}`
      : 'Source labels: none',
    ...(memoryLines.length > 0 ? ['', '### Related Memory Ledger Records', ...memoryLines] : []),
    '',
  ]
}

function graphContextPackageLines(contextPackage: AskContextPackage): string[] {
  const graph = contextPackage.graph
  const trimmed = (graph?.truncatedNodes ?? 0) + (graph?.truncatedEdges ?? 0)
  return [
    '## Grimoire Graph Council Package',
    'Origin: graph-council',
    `Visible public graph notes: ${contextPackage.references.length} of ${contextPackage.visibleCount}`,
    `Visible graph links: ${graph?.visibleEdges ?? 0}`,
    `Withheld: ${contextPackage.withheld.protectedNotes} protected graph notes, ${graph?.protectedEdges ?? 0} protected graph links`,
    trimmed > 0 ? `Trimmed: ${trimmed} graph items` : 'Trimmed: none',
    contextPackage.sourceLabels.length > 0
      ? `Source labels: ${contextPackage.sourceLabels.map((label) => `[[${label}]]`).join(', ')}`
      : 'Source labels: none',
    '',
  ]
}

/** Builds the provider-bound prompt, including safe selected note references. */
export function buildFormattedMessage(
  context: AgentExecutionContext,
  messages: AiAgentMessage[],
  prompt: PendingUserPrompt,
): { formattedMessage: string; systemPrompt: string } {
  const systemPrompt = withRuntimeRouteDisclosure(
    context.systemPromptOverride ?? buildAgentSystemPrompt(),
    context,
  )
  const chatHistory = toChatHistory(messages.filter((message) => !message.isStreaming && !message.isQueued))
  const trimmedHistory = trimHistory(chatHistory, MAX_HISTORY_TOKENS)
  const promptText = promptWithReferences(prompt)

  return {
    formattedMessage: formatMessageWithHistory(trimmedHistory, promptText),
    systemPrompt,
  }
}

function withRuntimeRouteDisclosure(systemPrompt: string, context: AgentExecutionContext): string {
  const provider = routeProvider(context)
  const model = context.model?.trim()
  if (!provider && !model) return systemPrompt

  const definition = getAiAgentDefinition(context.agent)
  const modelLabel = model || `${AI_AGENT_CLI_DEFAULT_ROUTE} (exact model not disclosed by the CLI)`
  return [
    systemPrompt,
    '',
    'Runtime route visible in Grimoire:',
    `- Agent: ${definition.label}`,
    `- Provider: ${provider ?? 'CLI default'}`,
    `- Model: ${modelLabel}`,
    'If the user asks which provider or model you are using, answer only from this route. Do not guess a model family or claim an exact model when the route says CLI default.',
  ].join('\n')
}

function routeProvider(context: AgentExecutionContext): string | null {
  if (!supportsAiAgentProviderRoute(context.agent)) return null

  const provider = context.provider?.trim()
  if (provider) return provider
  return AI_AGENT_CLI_DEFAULT_ROUTE
}

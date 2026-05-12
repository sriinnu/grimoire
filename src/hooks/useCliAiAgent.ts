import { useEffect, useMemo, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { AiAgentId } from '../lib/aiAgents'
import type { NoteReference } from '../utils/ai-context'
import {
  appendQueuedMessage,
  type AiAgentMessage,
  type PendingUserPrompt,
} from '../lib/aiAgentConversation'
import {
  clearAgentConversation,
  sendAgentMessage,
  type AiAgentSessionRuntime,
} from '../lib/aiAgentSession'
import type { ToolInvocation } from '../lib/aiAgentMessageState'
import {
  type AgentFileCallbacks,
  type AgentStatus,
} from './useAiAgent'

export type { AgentFileCallbacks, AgentStatus } from './useAiAgent'
export type { AiAgentMessage } from '../lib/aiAgentConversation'

interface UseCliAiAgentOptions {
  agent: AiAgentId
  agentReady: boolean
  provider?: string | null
  model?: string | null
}

interface UseCliAiAgentRuntime extends AiAgentSessionRuntime {
  messages: AiAgentMessage[]
  setMessages: Dispatch<SetStateAction<AiAgentMessage[]>>
  status: AgentStatus
  setStatus: Dispatch<SetStateAction<AgentStatus>>
  messagesRef: MutableRefObject<AiAgentMessage[]>
  statusRef: MutableRefObject<AgentStatus>
}

function useCliAiAgentRuntime(fileCallbacks: AgentFileCallbacks | undefined): UseCliAiAgentRuntime {
  const [messages, setMessages] = useState<AiAgentMessage[]>([])
  const [status, setStatus] = useState<AgentStatus>('idle')
  const abortRef = useRef({ aborted: false })
  const responseAccRef = useRef('')
  const fileCallbacksRef = useRef(fileCallbacks)
  const toolInputMapRef = useRef<Map<string, ToolInvocation>>(new Map())
  const messagesRef = useRef<AiAgentMessage[]>([])
  const statusRef = useRef<AgentStatus>('idle')

  useEffect(() => { messagesRef.current = messages }, [messages])
  useEffect(() => { statusRef.current = status }, [status])
  useEffect(() => { fileCallbacksRef.current = fileCallbacks }, [fileCallbacks])

  return useMemo(() => ({
    messages,
    setMessages,
    status,
    setStatus,
    abortRef,
    responseAccRef,
    fileCallbacksRef,
    toolInputMapRef,
    messagesRef,
    statusRef,
  }), [messages, status])
}

export function useCliAiAgent(
  vaultPath: string,
  contextPrompt: string | undefined,
  fileCallbacks: AgentFileCallbacks | undefined,
  options: UseCliAiAgentOptions,
) {
  const { agent, agentReady, provider, model } = options
  const runtime = useCliAiAgentRuntime(fileCallbacks)
  const { messages, status } = runtime
  const queuedPromptsRef = useRef<PendingUserPrompt[]>([])
  const [queuedVersion, setQueuedVersion] = useState(0)
  const context = useMemo(() => ({
    agent,
    ready: agentReady,
    vaultPath,
    systemPromptOverride: contextPrompt,
    provider,
    model,
  }), [agent, agentReady, contextPrompt, model, provider, vaultPath])

  function enqueuePrompt(prompt: PendingUserPrompt): void {
    const queuedMessageId = appendQueuedMessage(runtime.setMessages, prompt)
    queuedPromptsRef.current.push({ ...prompt, queuedMessageId })
    setQueuedVersion((current) => current + 1)
  }

  async function sendMessage(text: string, references?: NoteReference[]): Promise<void> {
    const prompt = { text, references }
    if (runtime.statusRef.current === 'thinking' || runtime.statusRef.current === 'tool-executing') {
      if (text.trim()) enqueuePrompt(prompt)
      return
    }

    await sendAgentMessage({
      runtime,
      context,
      prompt,
    })
  }

  function clearConversation(): void {
    queuedPromptsRef.current = []
    setQueuedVersion((current) => current + 1)
    clearAgentConversation(runtime)
  }

  useEffect(() => {
    if (status === 'thinking' || status === 'tool-executing') return

    const nextPrompt = queuedPromptsRef.current.shift()
    if (!nextPrompt) return

    void sendAgentMessage({
      runtime,
      context,
      prompt: nextPrompt,
    })
  }, [context, queuedVersion, runtime, status])

  return { messages, status, sendMessage, clearConversation }
}

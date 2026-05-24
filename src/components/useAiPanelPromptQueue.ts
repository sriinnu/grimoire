import { startTransition, useCallback, useEffect, useState } from 'react'
import type { AskContextPackage } from '../lib/askContextPackage'
import type { NoteReference } from '../utils/ai-context'
import type { QueuedAiPrompt } from '../utils/aiPromptBridge'
import { useQueuedAiPrompt } from './useQueuedAiPrompt'

interface AiAgentBridge {
  clearConversation: () => void
  sendMessage: (text: string, references: NoteReference[], contextPackage?: AskContextPackage) => void
}

interface UseAiPanelPromptQueueArgs {
  agent: AiAgentBridge
  input: string
  isActive: boolean
  onContextPackage?: (contextPackage: AskContextPackage | null) => void
  setInput: (value: string) => void
}

export function useAiPanelPromptQueue({
  agent,
  input,
  isActive,
  onContextPackage,
  setInput,
}: UseAiPanelPromptQueueArgs) {
  const [queuedPrompt, setQueuedPrompt] = useState<QueuedAiPrompt | null>(null)

  const handleQueuedPrompt = useCallback((prompt: QueuedAiPrompt) => {
    setInput(prompt.text)
    setQueuedPrompt(prompt)
    onContextPackage?.(prompt.contextPackage ?? null)
    agent.clearConversation()
  }, [agent, onContextPackage, setInput])

  useQueuedAiPrompt(handleQueuedPrompt)

  useEffect(() => {
    if (!queuedPrompt || isActive) return
    if (input !== queuedPrompt.text) return

    if (queuedPrompt.contextPackage) {
      agent.sendMessage(queuedPrompt.text, queuedPrompt.references, queuedPrompt.contextPackage)
    } else {
      agent.sendMessage(queuedPrompt.text, queuedPrompt.references)
    }
    startTransition(() => {
      setInput('')
      setQueuedPrompt(null)
    })
  }, [agent, input, isActive, queuedPrompt, setInput])
}

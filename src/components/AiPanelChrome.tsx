import { useEffect, useRef } from 'react'
import { Link, Robot } from '@phosphor-icons/react'
import { Plus, SendHorizontal, ShieldCheck, Sparkles, X } from 'lucide-react'
import { AiMessage } from './AiMessage'
import { AiChatComposerInput } from './AiChatComposerInput'
import type { AiAgentMessage } from '../hooks/useCliAiAgent'
import type { NoteReference } from '../utils/ai-context'
import type { VaultEntry } from '../types'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { buildProviderPromptDraft } from '../lib/providerPromptPrivacy'

interface AiPanelHeaderProps {
  agentLabel: string
  agentRouteLabel?: string | null
  agentReady: boolean
  legacyCopy: boolean
  canCrystallize: boolean
  crystallizeBlockedReason?: string | null
  onClose: () => void
  onCrystallize: () => void
  onNewChat: () => void
}

interface AiPanelContextBarProps {
  activeEntry: VaultEntry
  linkedCount: number
}

interface AiPanelBriefProps {
  agentLabel: string
  activeEntry: VaultEntry
  linkedCount: number
  conversationActive: boolean
}

interface AiPanelMessageHistoryProps {
  agentLabel: string
  agentReady: boolean
  legacyCopy: boolean
  messages: AiAgentMessage[]
  isActive: boolean
  onOpenNote?: (path: string) => void
  onNavigateWikilink?: (target: string) => void
  hasContext: boolean
}

interface AiPanelComposerProps {
  entries: VaultEntry[]
  agentLabel: string
  agentReady: boolean
  hasContext: boolean
  input: string
  inputRef: React.RefObject<HTMLElement | null>
  isActive: boolean
  legacyCopy: boolean
  onChange: (value: string) => void
  onSend: (text: string, references: NoteReference[]) => void
  onUnsupportedAiPaste?: (message: string) => void
}

function getComposerPlaceholder(
  agentLabel: string,
  agentReady: boolean,
  legacyCopy: boolean,
  hasContext: boolean,
): string {
  if (!agentReady) {
    return `${agentLabel} is not installed. Open Local AI in Settings.`
  }

  if (legacyCopy) {
    return hasContext ? 'Ask about this note...' : 'Ask the AI agent...'
  }

  return hasContext ? `Ask ${agentLabel} about this note...` : `Ask ${agentLabel}...`
}

function AiPanelEmptyState({
  agentLabel,
  agentReady,
  hasContext,
  legacyCopy,
}: Pick<AiPanelMessageHistoryProps, 'agentLabel' | 'agentReady' | 'hasContext' | 'legacyCopy'>) {
  if (!agentReady) {
    return (
      <div
        className="flex flex-col items-center justify-center text-center text-muted-foreground"
        style={{ paddingTop: 40 }}
      >
        <Robot size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
        <p style={{ fontSize: 14, margin: '0 0 4px' }}>
          {agentLabel} is not available on this machine
        </p>
        <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>
          Install it or switch the default AI agent in Settings
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center text-center text-muted-foreground"
      style={{ paddingTop: 40 }}
    >
      <Robot size={24} style={{ marginBottom: 8, opacity: 0.5 }} />
      <p style={{ fontSize: 14, margin: '0 0 4px' }}>
        {hasContext
          ? legacyCopy ? 'Ask about this note and its linked context' : `Ask ${agentLabel} about this note and its linked context`
          : legacyCopy ? 'Open a note, then ask the AI about it' : `Open a note, then ask ${agentLabel} about it`
        }
      </p>
      <p style={{ fontSize: 12, margin: 0, opacity: 0.6 }}>
        {hasContext
          ? 'Summarize, find connections, expand ideas'
          : 'The AI will use the active note as context'
        }
      </p>
    </div>
  )
}

export function AiPanelHeader({
  agentLabel,
  agentRouteLabel,
  agentReady,
  canCrystallize,
  crystallizeBlockedReason,
  legacyCopy,
  onClose,
  onCrystallize,
  onNewChat,
}: AiPanelHeaderProps) {
  const title = legacyCopy ? 'AI Chat' : agentLabel
  const subLine = legacyCopy
    ? null
    : [agentRouteLabel, agentReady ? null : 'not installed'].filter(Boolean).join(' · ') || null
  return (
    <div
      className="ai-panel-header flex shrink-0 items-center"
      style={{
        height: 52,
        padding: '0 12px',
        gap: 9,
        borderBottom: '1px solid color-mix(in srgb, var(--grimoire-hairline, var(--border-default)) 80%, transparent)',
      }}
      data-testid="ai-panel-header"
    >
      <span
        className="ai-panel-header__glyph relative flex shrink-0 items-center justify-center"
        aria-hidden="true"
        style={{
          width: 26,
          height: 26,
          borderRadius: 8,
          background: 'color-mix(in srgb, var(--primary) 14%, transparent)',
          border: '1px solid color-mix(in srgb, var(--primary) 28%, transparent)',
        }}
      >
        <Sparkles className="size-4" style={{ color: 'var(--primary)' }} />
        <span
          className="ai-panel-header__status absolute"
          data-agent-ready={agentReady || undefined}
          title={agentReady ? `${agentLabel} ready` : `${agentLabel} not installed`}
          style={{
            right: -2,
            bottom: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: agentReady ? 'var(--primary)' : 'var(--accent-yellow, #d8a23a)',
            boxShadow: '0 0 0 2px var(--surface-panel, var(--background))',
          }}
        />
      </span>
      <div className="flex flex-1 flex-col overflow-hidden" style={{ gap: 1 }}>
        <span
          className="truncate"
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {title}
        </span>
        {subLine && (
          <span
            className="truncate"
            style={{ fontSize: 12, lineHeight: 1.3, color: 'var(--text-muted)' }}
          >
            {`${agentLabel} · ${subLine}`}
          </span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        disabled={!canCrystallize}
        onClick={onCrystallize}
        aria-label="Crystallize latest AI response"
        title={crystallizeBlockedReason ?? 'Crystallize latest AI response'}
        data-testid="ai-crystallize"
      >
        <Sparkles className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onNewChat}
        aria-label="New AI chat"
        title="New AI chat"
      >
        <Plus className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        onClick={onClose}
        aria-label="Close AI panel"
        title="Close AI panel"
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function AiPanelBrief({
  agentLabel,
  activeEntry,
  linkedCount,
  conversationActive,
}: AiPanelBriefProps) {
  const policy = resolveEntryLocalityPolicy(activeEntry)
  const visibleTitle = policy.localOnly ? 'a local-only note' : activeEntry.title
  const linkedClause = !policy.localOnly && linkedCount > 0
    ? ` and its ${linkedCount} linked ${linkedCount === 1 ? 'note' : 'notes'}`
    : ''
  const brief = `${agentLabel} can see ${visibleTitle}${linkedClause} for this turn.`

  return (
    <p
      className="ai-panel-brief shrink-0 truncate"
      data-testid="ai-panel-brief"
      data-collapsed={conversationActive || undefined}
      style={{
        margin: 0,
        padding: conversationActive ? '6px 12px' : '8px 12px 10px',
        fontSize: 13,
        lineHeight: 1.4,
        color: 'var(--text-muted)',
        whiteSpace: conversationActive ? 'nowrap' : 'normal',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        borderBottom: '1px solid color-mix(in srgb, var(--grimoire-hairline, var(--border-subtle)) 60%, transparent)',
      }}
    >
      {brief}
    </p>
  )
}

export function AiPanelContextBar({ activeEntry, linkedCount }: AiPanelContextBarProps) {
  const policy = resolveEntryLocalityPolicy(activeEntry)
  const visibleTitle = policy.localOnly ? 'Local-only note' : activeEntry.title

  return (
    <div
      className="flex shrink-0 items-center border-b border-border text-muted-foreground"
      style={{ padding: '6px 12px', gap: 6, fontSize: 12 }}
      data-testid="context-bar"
    >
      <Link size={12} className="shrink-0" />
      <span className="truncate" style={{ fontWeight: 500 }}>{visibleTitle}</span>
      {policy.localOnly ? (
        <Badge variant="outline" className="h-7 rounded-md px-2.5 text-[13px]">
          <ShieldCheck className="size-4" />
          Protected
        </Badge>
      ) : null}
      {!policy.localOnly && linkedCount > 0 && (
        <span style={{ opacity: 0.6 }}>+ {linkedCount} linked</span>
      )}
    </div>
  )
}

export function AiPanelMessageHistory({
  agentLabel,
  agentReady,
  legacyCopy,
  messages,
  isActive,
  onOpenNote,
  onNavigateWikilink,
  hasContext,
}: AiPanelMessageHistoryProps) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isActive])

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
      {messages.length === 0 && !isActive && (
        <AiPanelEmptyState
          agentLabel={agentLabel}
          agentReady={agentReady}
          legacyCopy={legacyCopy}
          hasContext={hasContext}
        />
      )}
      {messages.map((message, index) => (
        <AiMessage
          key={message.id ?? index}
          {...message}
          onOpenNote={onOpenNote}
          onNavigateWikilink={onNavigateWikilink}
        />
      ))}
      <div ref={endRef} />
    </div>
  )
}

export function AiPanelComposer({
  entries,
  agentLabel,
  agentReady,
  hasContext,
  input,
  inputRef,
  isActive,
  legacyCopy,
  onChange,
  onSend,
  onUnsupportedAiPaste,
}: AiPanelComposerProps) {
  void isActive
  const composerDisabled = !agentReady
  const canSend = !composerDisabled && input.trim().length > 0
  const placeholder = getComposerPlaceholder(agentLabel, agentReady, legacyCopy, hasContext)
  const sendInput = () => {
    const draft = buildProviderPromptDraft(input, entries)
    if (!draft.text.trim()) return
    onSend(draft.text, draft.references)
  }

  return (
    <div
      className="ai-panel-composer flex shrink-0 flex-col"
      style={{
        padding: '8px 12px',
        borderTop: '1px solid color-mix(in srgb, var(--grimoire-hairline, var(--border-default)) 80%, transparent)',
      }}
    >
      <div className="flex items-end gap-2.5">
        <div className="flex-1">
          <AiChatComposerInput
            entries={entries}
            value={input}
            onChange={onChange}
            onSend={onSend}
            onUnsupportedPaste={onUnsupportedAiPaste}
            disabled={composerDisabled}
            placeholder={placeholder}
            inputRef={inputRef}
          />
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant={canSend ? 'default' : 'secondary'}
          className="h-[34px] w-8 shrink-0"
          onClick={sendInput}
          disabled={!canSend}
          title="Send message"
          data-testid="agent-send"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  )
}

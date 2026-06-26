import { lazy, Suspense, useState, useCallback, useEffect, useRef, type CSSProperties } from 'react'
import { CaretRight, CaretDown, ArrowCounterClockwise } from '@phosphor-icons/react'
import { Glyph } from './glyphs/Glyph'
import { AiActionCard, type AiActionStatus } from './AiActionCard'
import { AI_AGENT_CLI_DEFAULT_ROUTE, getAiAgentDefinition, type AiAgentRuntimeRoute } from '../lib/aiAgents'
import type { NoteReference } from '../utils/ai-context'
import { getTypeColor } from '../utils/typeColors'

const MarkdownContentSurface = lazy(async () => ({
  default: (await import('./MarkdownContent')).MarkdownContent,
}))

export interface AiAction {
  tool: string
  toolId: string
  label: string
  path?: string
  status: AiActionStatus
  input?: string
  output?: string
}

export interface AiMessageProps {
  userMessage: string
  references?: NoteReference[]
  route?: AiAgentRuntimeRoute
  reasoning?: string
  reasoningDone?: boolean
  actions: AiAction[]
  response?: string
  isStreaming?: boolean
  isQueued?: boolean
  onOpenNote?: (path: string) => void
  onNavigateWikilink?: (target: string) => void
}

function ReferencePill({ reference, onClick }: {
  reference: NoteReference
  onClick?: (path: string) => void
}) {
  const color = getTypeColor(reference.type)
  const style = {
    '--reference-type-color': color,
    background: 'var(--ai-reference-pill-bg, color-mix(in srgb, var(--reference-type-color) 11%, var(--card)))',
    borderColor: 'var(--ai-reference-pill-border, color-mix(in srgb, var(--reference-type-color) 22%, var(--border)))',
    color: 'var(--ai-reference-pill-fg, var(--reference-type-color))',
    borderRadius: 9999,
    padding: '1px 8px',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'inherit',
    lineHeight: 1.4,
  } as CSSProperties & { '--reference-type-color': string }

  return (
    <button
      className="ai-reference-pill inline-flex items-center cursor-pointer border transition-opacity hover:opacity-80"
      style={style}
      onClick={() => onClick?.(reference.path)}
      data-reference-pill="true"
      data-testid="message-reference-pill"
    >
      {reference.title}
    </button>
  )
}

function UserBubble({ content, references, onOpenNote }: {
  content: string
  references?: NoteReference[]
  onOpenNote?: (path: string) => void
}) {
  return (
    <div className="flex justify-end" style={{ marginBottom: 8 }}>
      <div
        data-ai-message-bubble="user"
        style={{
          background: 'var(--ai-message-user-bg, var(--muted))',
          border: '1px solid var(--ai-message-user-border, transparent)',
          color: 'var(--ai-message-user-fg, var(--foreground))',
          borderRadius: '12px 12px 2px 12px',
          maxWidth: '85%',
          padding: '8px 12px',
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        {references && references.length > 0 && (
          <div className="flex flex-wrap gap-2" style={{ marginBottom: 4 }}>
            {references.map(ref => (
              <ReferencePill key={ref.path} reference={ref} onClick={onOpenNote} />
            ))}
          </div>
        )}
        {content}
      </div>
    </div>
  )
}

function ReasoningBlock({ text, expanded, onToggle }: {
  text: string; expanded: boolean; onToggle: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (expanded && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [expanded, text])

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        className="flex items-center gap-2 w-full border-none bg-transparent cursor-pointer p-0 text-muted-foreground hover:text-foreground transition-colors"
        style={{ fontSize: 13, padding: '4px 0' }}
        onClick={onToggle}
        data-testid="reasoning-toggle"
      >
        <Glyph name="brain" size={14} />
        <span>Reasoning</span>
        {expanded ? <CaretDown size={12} /> : <CaretRight size={12} />}
      </button>
      {expanded && (
        <div
          ref={contentRef}
          className="text-muted-foreground"
          style={{ fontSize: 13, lineHeight: 1.5, padding: '4px 0 4px 20px', maxHeight: 200, overflowY: 'auto' }}
          data-testid="reasoning-content"
        >
          {text}
        </div>
      )}
    </div>
  )
}

interface RouteDisclosure {
  provider?: string
  model?: string
}

function extractRouteDisclosure(reasoning?: string): RouteDisclosure | null {
  const routeIndex = reasoning?.search(/Chitragupta route resolved/i) ?? -1
  if (routeIndex < 0 || !reasoning) return null

  const routeBlock = reasoning.slice(routeIndex, routeIndex + 220).replace(/\\[rn]/g, ' ').replace(/\s+/g, ' ')
  const provider = extractRouteField(routeBlock, 'provider')
  const model = extractRouteField(routeBlock, 'model')

  if (!provider && !model) return null
  return { provider, model }
}

function extractRouteField(routeBlock: string, fieldName: 'provider' | 'model'): string | undefined {
  return routeBlock.match(new RegExp(`\\b${fieldName}\\s*(?::|=)?\\s*([^,\\s]+)`, 'i'))?.[1]?.trim()
}

function routeChipDetail(route: RouteDisclosure | AiAgentRuntimeRoute): string {
  const detail = [
    'agent' in route ? `Agent: ${getAiAgentDefinition(route.agent).label}` : null,
    route.provider ? `Provider: ${route.provider}` : null,
    route.model ? `Model: ${route.model}` : null,
    'source' in route ? routeSourceLabel(route) : null,
  ].filter(Boolean).join(' · ')

  return detail
}

function routeSourceLabel(route: AiAgentRuntimeRoute): string {
  if (route.source === 'stream') return 'Source: Chitragupta route stream'
  if (route.source === 'configured') return 'Source: Grimoire route settings'
  return route.provider === AI_AGENT_CLI_DEFAULT_ROUTE || route.model === AI_AGENT_CLI_DEFAULT_ROUTE
    ? 'Source: pending CLI stream'
    : 'Source: CLI default'
}

function RouteDisclosureChip({ route }: { route: RouteDisclosure | AiAgentRuntimeRoute }) {
  const detail = routeChipDetail(route)

  return (
    <div
      className="inline-flex max-w-full items-center rounded-full border border-border bg-muted/45 px-2.5 py-2 text-[13px] font-medium text-muted-foreground"
      data-testid="ai-route-disclosure"
      title={detail}
      style={{ marginBottom: 8 }}
    >
      <span className="truncate">{detail}</span>
    </div>
  )
}

function ActionCardsList({ actions, onOpenNote, expandedIds, onToggleExpand }: {
  actions: AiAction[]
  onOpenNote?: (path: string) => void
  expandedIds: Set<string>
  onToggleExpand: (toolId: string) => void
}) {
  return (
    <div className="flex flex-col gap-2" style={{ marginBottom: 8 }}>
      {actions.map((action) => (
        <AiActionCard
          key={action.toolId}
          tool={action.tool}
          label={action.label}
          path={action.path}
          status={action.status}
          input={action.input}
          output={action.output}
          expanded={expandedIds.has(action.toolId)}
          onToggle={() => onToggleExpand(action.toolId)}
          onOpenNote={onOpenNote}
        />
      ))}
    </div>
  )
}

function ResponseBlock({ text, onNavigateWikilink }: { text: string; onNavigateWikilink?: (target: string) => void }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <Suspense fallback={<ResponsePlainTextFallback text={text} />}>
        <MarkdownContentSurface content={text} onWikilinkClick={onNavigateWikilink} />
      </Suspense>
      <button
        className="flex items-center gap-2 border-none bg-transparent p-0 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
        style={{ fontSize: 12, marginTop: 4 }}
        data-testid="undo-button"
      >
        <ArrowCounterClockwise size={12} />
        <span>Undo</span>
      </button>
    </div>
  )
}

function ResponsePlainTextFallback({ text }: { text: string }) {
  return (
    <div
      className="whitespace-pre-wrap"
      data-testid="markdown-content-fallback"
      style={{ color: 'var(--ai-message-assistant-fg, var(--foreground))', fontSize: 14, lineHeight: 1.55 }}
    >
      {text}
    </div>
  )
}

function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2.5 text-muted-foreground" style={{ fontSize: 13, padding: '4px 0' }}>
      <div className="flex gap-2">
        <span className="typing-dot" />
        <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}

function QueuedIndicator() {
  return (
    <div className="text-muted-foreground" style={{ fontSize: 13, padding: '2px 0 4px' }}>
      Queued
    </div>
  )
}

export function AiMessage({ userMessage, references, route, reasoning, reasoningDone, actions, response, isStreaming, isQueued, onOpenNote, onNavigateWikilink }: AiMessageProps) {
  // Manual override: null = follow auto behavior, true/false = user forced
  const [userOverride, setUserOverride] = useState(false)
  const [expandedActions, setExpandedActions] = useState<Set<string>>(new Set())
  const routeDisclosure = route ?? extractRouteDisclosure(reasoning)

  // Auto: expanded while reasoning streams, collapsed once done
  // User can manually toggle to override the auto state
  const autoExpanded = !reasoningDone
  const reasoningExpanded = userOverride ? !autoExpanded : autoExpanded

  const toggleAction = useCallback((toolId: string) => {
    setExpandedActions(prev => {
      const next = new Set(prev)
      if (next.has(toolId)) next.delete(toolId)
      else next.add(toolId)
      return next
    })
  }, [])

  return (
    <div data-testid="ai-message" style={{ marginBottom: 16 }}>
      <UserBubble content={userMessage} references={references} onOpenNote={onOpenNote} />
      {reasoning && (
        <ReasoningBlock
          text={reasoning}
          expanded={reasoningExpanded}
          onToggle={() => setUserOverride(prev => !prev)}
        />
      )}
      {routeDisclosure && <RouteDisclosureChip route={routeDisclosure} />}
      {actions.length > 0 && (
        <ActionCardsList
          actions={actions}
          onOpenNote={onOpenNote}
          expandedIds={expandedActions}
          onToggleExpand={toggleAction}
        />
      )}
      {response && <ResponseBlock text={response} onNavigateWikilink={onNavigateWikilink} />}
      {isQueued && <QueuedIndicator />}
      {isStreaming && !response && <StreamingIndicator />}
    </div>
  )
}

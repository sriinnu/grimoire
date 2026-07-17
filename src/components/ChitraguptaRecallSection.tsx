import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  buildChitraguptaContext,
  createChitraguptaRecallAttachment,
  type ChitraguptaContextBuildResult,
  type ChitraguptaRecallAttachment,
} from '../lib/chitraguptaContext'
import { isTauriRuntimeAvailable } from '../lib/tauriRuntime'

interface ChitraguptaRecallSectionProps {
  protectedContext: boolean
  reviewReceipt: string
  vaultPath?: string
  onBuiltRecall?: (attachment: ChitraguptaRecallAttachment) => void
  onUseRecall?: (attachment: ChitraguptaRecallAttachment) => void
}

/** A deliberate, visible bridge from the local Context Inspector to recall. */
export function ChitraguptaRecallSection({
  protectedContext,
  reviewReceipt,
  vaultPath,
  onBuiltRecall,
  onUseRecall,
}: ChitraguptaRecallSectionProps) {
  const [question, setQuestion] = useState('')
  const [result, setResult] = useState<ChitraguptaContextBuildResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const attachment = result ? createChitraguptaRecallAttachment(result) : null

  async function buildRecall() {
    const query = question.trim()
    if (!query || !vaultPath || protectedContext) return
    setPending(true)
    setError(null)
    try {
      const nextResult = await buildChitraguptaContext({
        query,
        project: vaultPath,
        requestId: `grimoire:${reviewReceipt}`,
      })
      setResult(nextResult)
      const nextAttachment = createChitraguptaRecallAttachment(nextResult)
      if (nextAttachment) onBuiltRecall?.(nextAttachment)
    } catch (reason) {
      setResult(null)
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setPending(false)
    }
  }

  return (
    <section
      className="grimoire-context-surface grid gap-2 rounded-md border p-2.5"
      style={{
        background: 'color-mix(in srgb, var(--surface-card, var(--background)) 94%, var(--primary) 6%)',
        borderColor: 'color-mix(in srgb, var(--text-primary) 22%, var(--border))',
      }}
      data-testid="chitragupta-recall"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-3.5 text-foreground" />
        <span className="grimoire-context-label text-xs font-semibold">Chitragupta recall</span>
        <Badge
          variant="outline"
          className="grimoire-context-pill ml-auto rounded-md text-[10px] font-semibold"
        >
          {protectedContext ? 'Held local' : 'On demand'}
        </Badge>
      </div>
      {protectedContext ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">
          Protected context stays on this device. Recall is unavailable for this request.
        </p>
      ) : !vaultPath ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">
          Open a vault to ask Chitragupta for a reviewed recall packet.
        </p>
      ) : !isTauriRuntimeAvailable() ? (
        <p className="grimoire-context-secondary text-[11px] leading-4">
          Available in the desktop app. Nothing is sent automatically.
        </p>
      ) : (
        <>
          <div className="flex gap-2">
            <Textarea
              aria-label="Question for Chitragupta recall"
              className="min-h-9 flex-1 resize-none py-2 text-xs"
              disabled={pending}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What should I recall for this request?"
              value={question}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 self-end text-xs"
              disabled={!question.trim() || pending}
              onClick={() => { void buildRecall() }}
              data-testid="chitragupta-recall-build"
            >
              {pending ? 'Building…' : 'Build recall'}
            </Button>
          </div>
          <p className="grimoire-context-secondary text-[10px] leading-4">
            Sends this question and vault scope only. Notes, selections, and Git content remain in Grimoire.
          </p>
        </>
      )}
      {error ? <p className="text-[11px] leading-4 text-destructive" role="status">{error}</p> : null}
      {result ? <RecallResult attachment={attachment} result={result} onUseRecall={onUseRecall} /> : null}
    </section>
  )
}

function RecallResult({
  attachment,
  result,
  onUseRecall,
}: {
  attachment: ChitraguptaRecallAttachment | null
  result: ChitraguptaContextBuildResult
  onUseRecall?: (attachment: ChitraguptaRecallAttachment) => void
}) {
  const recalledCount = result.recalled?.length ?? 0
  const predictionCount = result.live?.predictions?.length ?? 0
  const recallItems = attachment?.items ?? []
  return (
    <div className="grid gap-2" data-testid="chitragupta-recall-result">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant="secondary"
          className="grimoire-context-pill rounded-md text-[10px] font-semibold"
          data-tone="active"
        >
          {recalledCount} {recalledCount === 1 ? 'memory' : 'memories'}
        </Badge>
        <Badge
          variant="outline"
          className="grimoire-context-pill rounded-md text-[10px] font-semibold"
        >
          {predictionCount} live {predictionCount === 1 ? 'signal' : 'signals'}
        </Badge>
        {result.degraded ? (
          <Badge
            variant="outline"
            className="grimoire-context-pill rounded-md text-[10px] font-semibold"
            data-tone="warning"
          >
            Degraded
          </Badge>
        ) : null}
        {result.warnings?.[0] ? <span className="grimoire-context-secondary text-[10px]">{result.warnings[0]}</span> : null}
      </div>
      {attachment && onUseRecall ? (
        <Button type="button" size="sm" variant="secondary" className="justify-self-start text-xs" onClick={() => onUseRecall(attachment)}>
          Use reviewed recall in next request
        </Button>
      ) : null}
      {recallItems.length ? (
        <details className="rounded-md border px-2 py-1.5" style={{ borderColor: 'color-mix(in srgb, var(--text-primary) 20%, var(--border))' }}>
          <summary className="grimoire-context-label cursor-pointer text-[10px] font-semibold">
            Review {recallItems.length} memory {recallItems.length === 1 ? 'excerpt' : 'excerpts'}
          </summary>
          <div className="mt-1.5 grid gap-1.5">
            {recallItems.map((item, index) => (
              <p key={`${item.primarySource ?? 'memory'}:${index}`} className="grimoire-context-secondary text-[10px] leading-4">
                {item.primarySource ? `${item.primarySource} · ` : ''}{item.answer}
              </p>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  )
}

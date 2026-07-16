import { Glyph } from './glyphs/Glyph'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface AiPanelIntelligenceSummaryProps {
  activeContextProtected: boolean
  heldCount: number
  onReviewPlan: () => void
  sourceCount: number
  onInspectContext: () => void
  reviewOpen: boolean
}

/**
 * The default Second Brain state should leave room for thought. Context is
 * always inspectable, but it is not a second dashboard above every answer.
 */
export function AiPanelIntelligenceSummary({
  activeContextProtected,
  heldCount,
  onReviewPlan,
  sourceCount,
  onInspectContext,
  reviewOpen,
}: AiPanelIntelligenceSummaryProps) {
  const sourceLabel = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`
  const localityLabel = activeContextProtected ? 'Local-only' : 'Source-safe'

  return (
    <section
      className="grimoire-context-surface border-b border-border px-3 py-2"
      data-locality={activeContextProtected ? 'protected-local' : 'source-safe'}
      data-testid="ai-intelligence-summary"
      style={{ background: 'color-mix(in srgb, var(--surface-panel, var(--background)) 82%, var(--primary) 4%)' }}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Glyph name="contextPacket" size={16} className="shrink-0" style={{ color: 'var(--text-secondary)' }} />
        <span className="grimoire-context-label truncate text-[13px] font-semibold">Context</span>
        <Badge
          variant="outline"
          className="grimoire-context-pill h-6 shrink-0 rounded-md px-2 text-[12px] font-semibold"
        >
          {sourceLabel}
        </Badge>
        {activeContextProtected || heldCount > 0 ? (
          <Badge
            variant="outline"
            className="grimoire-context-pill h-6 shrink-0 rounded-md px-2 text-[12px] font-semibold"
            data-tone="active"
          >
            {activeContextProtected ? localityLabel : `${heldCount} held`}
          </Badge>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="ml-auto h-7 shrink-0 px-2.5 text-[12px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
          onClick={onInspectContext}
          data-testid="ai-context-inspector"
        >
          Inspect
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-7 shrink-0 px-2.5 text-[12px] font-semibold"
          style={{ color: 'var(--text-primary)' }}
          onClick={onReviewPlan}
          aria-expanded={reviewOpen}
          data-testid="ai-intelligence-toggle"
        >
          Review
        </Button>
      </div>
    </section>
  )
}

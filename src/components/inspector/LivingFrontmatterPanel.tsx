import { Glyph } from '@/components/glyphs/Glyph'
import { useMemo, type ReactNode } from 'react'
import type { VaultEntry } from '../../types'
import type { ParsedFrontmatter } from '../../utils/frontmatter'
import {
  buildLivingFrontmatterHints,
  buildLivingFrontmatterReviewPlan,
  type LivingFrontmatterHint,
  type LivingFrontmatterHintSource,
  type LivingFrontmatterReviewPlan,
  type LivingFrontmatterSuggestedValue,
} from '../../lib/livingFrontmatter'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

interface LivingFrontmatterPanelProps {
  entry: VaultEntry
  entries: VaultEntry[]
  frontmatter: ParsedFrontmatter
  onApplySuggestion?: (field: string, value: LivingFrontmatterSuggestedValue) => void
}

const KIND_LABELS: Record<LivingFrontmatterHint['kind'], string> = {
  'duplicate-concept': 'Duplicate',
  'missing-field': 'Schema',
  'relationship-hint': 'Graph',
  'stale-status': 'Stale',
  'type-schema': 'Type',
}

/** Inspector lane for schema, status, duplicate, and relationship hints. */
export function LivingFrontmatterPanel({
  entry,
  entries,
  frontmatter,
  onApplySuggestion,
}: LivingFrontmatterPanelProps) {
  const hints = useMemo(
    () => buildLivingFrontmatterHints({ entry, entries, frontmatter }),
    [entry, entries, frontmatter],
  )
  const reviewPlan = useMemo(() => buildLivingFrontmatterReviewPlan(hints), [hints])
  const hasActions = !!onApplySuggestion && hints.some(canApplyHint)

  if (hints.length === 0) return null

  return (
    <section className="inspector-card" data-testid="living-frontmatter-panel" aria-label="Living Frontmatter">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h4 className="font-mono-overline flex items-center gap-1 text-muted-foreground">
          <Glyph name="insight" size={12} className="size-3" />
          Living Frontmatter
        </h4>
        <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
          {hasActions ? 'Markdown-owned' : 'Read-only'}
        </Badge>
      </div>
      <ReviewManifest plan={reviewPlan} />
      <div className="grid gap-1.5">
        {hints.slice(0, 5).map((hint) => (
          <HintRow key={hint.id} hint={hint} onApplySuggestion={onApplySuggestion} />
        ))}
      </div>
    </section>
  )
}

function ReviewManifest({ plan }: { plan: LivingFrontmatterReviewPlan }) {
  return (
    <div
      className="mb-2 grid grid-cols-2 gap-1.5 rounded-md border border-border bg-muted/20 p-1.5 text-[10px]"
      data-testid="living-frontmatter-review-manifest"
      aria-label="Living Frontmatter review manifest"
    >
      <ManifestChip label="Writes" value={`${plan.fieldCount} fields`} />
      <ManifestChip label="Findings" value={`${plan.readOnlyCount} read-only`} />
      <ManifestChip label="Source" value={plan.sourceLabels.join(' / ')} />
      <ManifestChip label="Target" value={formatReviewTarget(plan)} />
    </div>
  )
}

function ManifestChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded border border-border bg-background/60 px-1.5 py-1">
      <span className="mr-1 text-muted-foreground">{label}</span>
      <strong className="font-medium text-foreground">{value}</strong>
    </span>
  )
}

function formatReviewTarget(plan: LivingFrontmatterReviewPlan): string {
  if (plan.storagePolicy === 'markdown-on-disk' && plan.writePolicy === 'frontmatter-only') return 'Markdown YAML'
  return 'Review first'
}

function HintRow({
  hint,
  onApplySuggestion,
}: {
  hint: LivingFrontmatterHint
  onApplySuggestion?: (field: string, value: LivingFrontmatterSuggestedValue) => void
}) {
  const canApply = !!onApplySuggestion && canApplyHint(hint)

  return (
    <div
      className="rounded-md border border-border bg-muted/25 px-2 py-1.5 text-[11px]"
      data-testid="living-frontmatter-hint"
      data-severity={hint.severity}
    >
      <div className="mb-0.5 flex min-w-0 items-center gap-1.5">
        <span className="shrink-0 text-muted-foreground">{iconForHint(hint)}</span>
        <span className="min-w-0 flex-1 truncate text-foreground">{hint.label}</span>
        <Badge variant={hint.severity === 'warn' ? 'secondary' : 'outline'} className="rounded-md text-[10px]">
          {KIND_LABELS[hint.kind]}
        </Badge>
      </div>
      <p className="line-clamp-2 text-muted-foreground">{hint.detail}</p>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
        Source: {sourceLabel(hint.source)} / Write: {canApply ? 'frontmatter only' : 'review only'}
      </p>
      {canApply ? (
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[10px] text-muted-foreground">
            Suggested: {formatSuggestedValue(hint.suggestedValue)}
          </span>
          <Button
            type="button"
            size="xs"
            variant="outline"
            onClick={() => onApplySuggestion(hint.field, hint.suggestedValue)}
          >
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  )
}

const HINT_SOURCE_LABELS: Record<LivingFrontmatterHintSource, string> = {
  'body-wikilinks': 'body wikilinks',
  'built-in-rule': 'built-in rule',
  'type-note': 'Markdown Type note',
  'vault-neighborhood': 'vault neighborhood',
}

function sourceLabel(source: LivingFrontmatterHintSource): string {
  return HINT_SOURCE_LABELS[source]
}

function iconForHint(hint: LivingFrontmatterHint): ReactNode {
  if (hint.kind === 'relationship-hint') return <Glyph name="link" size={12} />
  if (hint.kind === 'duplicate-concept') return <Glyph name="tag" size={12} />
  if (hint.severity === 'warn') return <Glyph name="warning" size={12} />
  return <Glyph name="insight" size={12} className="size-3" />
}

function canApplyHint(
  hint: LivingFrontmatterHint,
): hint is LivingFrontmatterHint & { field: string; suggestedValue: LivingFrontmatterSuggestedValue } {
  return !!hint.field && hint.suggestedValue !== undefined
}

function formatSuggestedValue(value: LivingFrontmatterSuggestedValue | undefined): string {
  if (Array.isArray(value)) return value.join(', ')
  return String(value ?? '')
}

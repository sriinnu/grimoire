import type { LivingFrontmatterHint, LivingFrontmatterSuggestedValue } from '../../lib/livingFrontmatter'

export type ApplicableHint = LivingFrontmatterHint & { field: string; suggestedValue: LivingFrontmatterSuggestedValue }

export function canApplyHint(hint: LivingFrontmatterHint): hint is ApplicableHint {
  return !!hint.field && hint.suggestedValue !== undefined
}

export function formatSuggestedValue(value: LivingFrontmatterSuggestedValue | undefined): string {
  if (Array.isArray(value)) return value.join(', ')
  return String(value ?? '')
}

export interface PartitionedHints {
  /** Hints about a specific frontmatter field, keyed by lower-cased field name. Rendered under that field. */
  byField: Record<string, LivingFrontmatterHint[]>
  /** Hints about the page as a whole (duplicates, graph shape). Rendered after the fields. */
  loose: LivingFrontmatterHint[]
}

/** Splits Living Frontmatter hints into field-anchored rows and page-level notes. */
export function partitionLivingFrontmatterHints(hints: readonly LivingFrontmatterHint[]): PartitionedHints {
  const byField: Record<string, LivingFrontmatterHint[]> = {}
  const loose: LivingFrontmatterHint[] = []
  for (const hint of hints) {
    if (hint.field) {
      const key = hint.field.toLowerCase()
      ;(byField[key] ??= []).push(hint)
    } else {
      loose.push(hint)
    }
  }
  return { byField, loose }
}

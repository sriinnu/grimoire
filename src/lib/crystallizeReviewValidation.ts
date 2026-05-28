import { parseFrontmatter } from '../utils/frontmatter'

export interface CrystallizeReviewValidation {
  missingFields: string[]
  ok: boolean
}

const REQUIRED_FRONTMATTER = [
  'type',
  'source',
  'source_note',
  'confidence',
  'memory_status',
  'memory_review_state',
  'memory_source_count',
  'expires_at',
  'contradicted_by',
  'last_seen',
  'memory_version',
  'reviewed_at',
  'locality',
  'crystallized',
] as const

/** Validates the durable Markdown contract before a Crystallize write is accepted. */
export function validateCrystallizeMemoryMarkdown(markdown: string): CrystallizeReviewValidation {
  const frontmatter = parseFrontmatter(markdown)
  const missingFields: string[] = REQUIRED_FRONTMATTER.filter(field => !hasFrontmatterValue(frontmatter[field]))

  if (String(frontmatter.type ?? '').trim() !== 'Memory') missingFields.push('type: Memory')
  if (String(frontmatter.locality ?? '').trim() !== 'vault') missingFields.push('locality: vault')
  if (frontmatter.crystallized !== true) missingFields.push('crystallized: true')

  return {
    missingFields: [...new Set(missingFields)],
    ok: missingFields.length === 0,
  }
}

function hasFrontmatterValue(value: unknown): boolean {
  if (Array.isArray(value)) return true
  return value !== undefined && value !== null && String(value).trim() !== ''
}

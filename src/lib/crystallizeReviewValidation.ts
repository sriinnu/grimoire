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
  'crystallize_loop',
  'crystallize_receipt',
] as const

/** Validates the durable Markdown contract before a Crystallize write is accepted. */
export function validateCrystallizeMemoryMarkdown(markdown: string): CrystallizeReviewValidation {
  const frontmatter = parseFrontmatter(markdown)
  const missingFields: string[] = REQUIRED_FRONTMATTER.filter(field => !hasFrontmatterValue(frontmatter[field]))

  if (String(frontmatter.type ?? '').trim() !== 'Memory') missingFields.push('type: Memory')
  if (String(frontmatter.locality ?? '').trim() !== 'vault') missingFields.push('locality: vault')
  if (frontmatter.crystallized !== true) missingFields.push('crystallized: true')
  if (!isCrystallizeLoopValue(frontmatter.crystallize_loop)) {
    missingFields.push('crystallize_loop: Capture -> ... -> Markdown memory')
  }
  if (!/^crys-[0-9a-f]{8}$/.test(String(frontmatter.crystallize_receipt ?? '').trim())) {
    missingFields.push('crystallize_receipt: crys-*')
  }

  return {
    missingFields: [...new Set(missingFields)],
    ok: missingFields.length === 0,
  }
}

function hasFrontmatterValue(value: unknown): boolean {
  if (Array.isArray(value)) return true
  return value !== undefined && value !== null && String(value).trim() !== ''
}

function isCrystallizeLoopValue(value: unknown): boolean {
  const text = String(value ?? '')
  return text.includes('Capture') && text.includes('Markdown memory')
}

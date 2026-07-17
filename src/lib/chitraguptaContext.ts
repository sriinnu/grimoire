import { invoke, isTauriRuntimeAvailable } from './tauriRuntime'

export interface ChitraguptaContextBuildResult {
  schemaVersion: string
  requestId?: string
  recalled?: unknown[]
  live?: {
    predictions?: unknown[]
    guidanceBlock?: string | null
    predictionsBlock?: string | null
  } | null
  warnings?: string[]
  degraded?: boolean
  provenance?: unknown[]
}

export interface ChitraguptaContextBuildInput {
  query: string
  project: string
  requestId: string
  intent?: string
  limit?: number
}

/**
 * Bounded, user-approved recall content that may accompany one subsequent AI
 * request. It is intentionally separate from Grimoire's local Context
 * Manifest: selecting it is an explicit second handoff.
 */
export interface ChitraguptaRecallAttachment {
  degraded: boolean
  guidance: string | null
  /** Optional for compatibility with already-stored pre-excerpt chat state. */
  items?: ChitraguptaRecallItem[]
  predictions: string | null
  recalledCount: number
  requestId: string | null
  warnings: string[]
}

/** A bounded, user-reviewable memory excerpt from `context.build`. */
export interface ChitraguptaRecallItem {
  answer: string
  primarySource: string | null
  score: number | null
  snippet: string | null
}

/**
 * Calls the desktop-only, explicit recall seam. The caller must decide whether
 * Locality Firewall policy permits this request before invoking it.
 */
export async function buildChitraguptaContext(
  input: ChitraguptaContextBuildInput,
): Promise<ChitraguptaContextBuildResult> {
  if (!isTauriRuntimeAvailable()) {
    throw new Error('Chitragupta recall is available in the desktop app only.')
  }
  return invoke<ChitraguptaContextBuildResult>('build_chitragupta_context', {
    request: {
      query: input.query,
      project: input.project,
      request_id: input.requestId,
      intent: input.intent ?? 'explain',
      limit: input.limit ?? 5,
    },
  })
}

export function createChitraguptaRecallAttachment(
  result: ChitraguptaContextBuildResult,
): ChitraguptaRecallAttachment | null {
  const guidance = boundedText(result.live?.guidanceBlock)
  const predictions = boundedText(result.live?.predictionsBlock)
  const items = (result.recalled ?? [])
    .map(normalizeRecallItem)
    .filter((item): item is ChitraguptaRecallItem => item !== null)
    .slice(0, 5)
  const recalledCount = result.recalled?.length ?? 0
  if (!guidance && !predictions && items.length === 0 && recalledCount === 0) return null

  return {
    degraded: result.degraded === true,
    guidance,
    items,
    predictions,
    recalledCount,
    requestId: typeof result.requestId === 'string' ? result.requestId : null,
    warnings: (result.warnings ?? []).filter((warning): warning is string => typeof warning === 'string').slice(0, 3),
  }
}

function boundedText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 2_000) : null
}

function normalizeRecallItem(value: unknown): ChitraguptaRecallItem | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  const answer = boundedText(record.answer)
  if (!answer) return null
  const score = typeof record.score === 'number' && Number.isFinite(record.score)
    ? Math.max(0, Math.min(1, record.score))
    : null
  return {
    answer,
    primarySource: boundedShortText(record.primarySource),
    score,
    snippet: boundedText(record.snippet),
  }
}

function boundedShortText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed.slice(0, 120) : null
}

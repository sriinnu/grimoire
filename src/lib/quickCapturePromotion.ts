/**
 * Quick Capture auto-promotion — deterministic, local-only lane inference.
 *
 * Contract (docs/QUICK-CAPTURE-AUTO-PROMOTION.md): the draft never leaves the
 * sheet, never routes to an agent, and is never written to the vault without
 * an explicit promote action. These heuristics run on the device against the
 * draft text only; the threshold is an affordance trigger, not a command.
 */

export type CaptureLane = 'note' | 'journal' | 'task' | 'memory' | 'dream' | 'ask'

export interface Promotion {
  lane: CaptureLane
  confidence: 'high' | 'low'
  alternatives: CaptureLane[]
  /** Short plain-English rationale for tooltips/status copy. */
  reason: string
}

const LANE_ORDER: CaptureLane[] = ['note', 'journal', 'task', 'memory', 'dream', 'ask']

const TASK_LINE_VERB = /^\s*(buy|call|fix|send|finish)\b/i
const CHECKLIST_MARKER = /^\s*[-*]\s+\[[ xX]\]|\btodo\s*:/im
const ASK_START = /^(how|what|why|who|when|which|can\s+i|is\s+it)\b/i
const DREAM_SIGNAL = /\b(?:dreamt|dreamed|dreaming|dream|in my dream|last night i)\b/i
const MEMORY_SIGNAL = /\b(?:remember|don't forget|don’t forget|never forget)\b/i
const JOURNAL_SIGNAL = /\b(?:i feel|i felt|today i|this morning|this evening|grateful)\b/i

function alternativesFor(lane: CaptureLane): CaptureLane[] {
  return LANE_ORDER.filter((candidate) => candidate !== lane).slice(0, 3)
}

function promote(lane: CaptureLane, confidence: Promotion['confidence'], reason: string): Promotion {
  return { lane, confidence, alternatives: alternativesFor(lane), reason }
}

/**
 * Classify a draft into a promotion target. Ordered rules — the first strong
 * match wins. Returns null when the draft reads as a plain note (or when the
 * user has already picked a lane explicitly).
 */
export function classifyCaptureDraft(text: string, currentKind?: CaptureLane | null): Promotion | null {
  // 1. Respect an explicit user pick (anything but the default 'note').
  if (currentKind && currentKind !== 'note') return null

  const trimmed = text.trim()
  if (!trimmed) return null

  // 2. Task signals.
  if (CHECKLIST_MARKER.test(trimmed)) {
    return promote('task', 'high', 'checklist markers found')
  }
  if (trimmed.split('\n').some((line) => TASK_LINE_VERB.test(line))) {
    return promote('task', 'high', 'action verb at line start')
  }

  // 3. Ask signals.
  if (trimmed.endsWith('?') || ASK_START.test(trimmed)) {
    return promote('ask', 'high', 'shaped like a question')
  }

  // 4. Dream signals.
  if (DREAM_SIGNAL.test(trimmed)) {
    return promote('dream', 'high', 'dream language found')
  }

  // 5. Memory signals.
  if (MEMORY_SIGNAL.test(trimmed)) {
    return promote('memory', 'high', 'memory language found')
  }

  // 6. Journal signals (soft).
  if (JOURNAL_SIGNAL.test(trimmed)) {
    return promote('journal', 'low', 'first-person reflection')
  }

  // 7. Plain prose reads as a note — no promotion.
  return null
}

/**
 * Soft threshold gate. High-confidence promotions show at ≥100 characters or
 * ≥30 words; low-confidence ones need both (≥120 chars AND ≥30 words) so
 * faint signals do not nag on short drafts.
 */
export function shouldShowPromotion(text: string, promo: Promotion | null): boolean {
  if (!promo) return false
  const chars = text.length
  const words = text.trim().match(/\S+/g)?.length ?? 0
  if (promo.confidence === 'low') return chars >= 120 && words >= 30
  return chars >= 100 || words >= 30
}

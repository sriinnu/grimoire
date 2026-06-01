export const CRYSTALLIZE_LOOP_STEPS = [
  'Capture',
  'Local context',
  'Agent answer',
  'Human review',
  'Markdown memory',
] as const

export type CrystallizeLoopStep = typeof CRYSTALLIZE_LOOP_STEPS[number]

export interface CrystallizeLoopReceipt {
  id: string
  pathLabel: string
  steps: readonly CrystallizeLoopStep[]
}

interface CrystallizeLoopReceiptArgs {
  activeNoteTarget: string | null
  response: string
  reviewedAt: string
  sourceLabels: string[]
  sourceName: string
  targetPath: string
}

/** Builds a source-safe receipt for the capture-to-Markdown memory loop. */
export function buildCrystallizeLoopReceipt({
  activeNoteTarget,
  response,
  reviewedAt,
  sourceLabels,
  sourceName,
  targetPath,
}: CrystallizeLoopReceiptArgs): CrystallizeLoopReceipt {
  const pathLabel = CRYSTALLIZE_LOOP_STEPS.join(' -> ')
  const fingerprint = stableReceiptHash([
    sourceName,
    reviewedAt,
    targetPath,
    activeNoteTarget ?? 'no-active-note',
    ...sourceLabels,
    response,
  ])

  return {
    id: `crys-${fingerprint}`,
    pathLabel,
    steps: CRYSTALLIZE_LOOP_STEPS,
  }
}

/** Formats the visible loop receipt lines written into the Memory note body. */
export function buildCrystallizeLoopReceiptLines(receipt: CrystallizeLoopReceipt): string[] {
  return [
    `- Receipt: \`${receipt.id}\``,
    `- Path: ${receipt.pathLabel}`,
    '- Write gate: review-before-write',
    '- Git: not required',
    '- Remote sync: none',
  ]
}

function stableReceiptHash(parts: string[]): string {
  let hash = 0x811c9dc5
  for (const part of parts) {
    for (let index = 0; index < part.length; index += 1) {
      hash ^= part.charCodeAt(index)
      hash = Math.imul(hash, 0x01000193)
    }
    hash ^= 0xff
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

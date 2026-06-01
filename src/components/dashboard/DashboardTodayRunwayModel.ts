import {
  CAPTURE_KIND_CONFIGS,
  type CaptureKind,
} from '../../utils/dashboardCapture'

export const DASHBOARD_FLOW_KINDS = ['note', 'journal', 'task', 'ask'] as const

/** Dashboard Daily Flow step identifiers used by the runway selection model. */
export type DashboardFlowKind = typeof DASHBOARD_FLOW_KINDS[number]

/** Maps capture lanes onto the smaller four-step Daily Flow ritual. */
export function flowKindForCaptureKind(captureKind: CaptureKind | null): DashboardFlowKind | null {
  if (captureKind === 'ask') return 'ask'
  if (captureKind === 'journal' || captureKind === 'dream') return 'journal'
  if (captureKind === 'task' || captureKind === 'memory') return 'task'
  if (captureKind === 'note') return 'note'
  return null
}

/** Reads a leading quick-capture slash command without parsing the note body. */
export function captureKindForSlashInput(value: string): CaptureKind | null {
  const command = /^\s*\/([a-z-]+)\b/i.exec(value)?.[1].toLowerCase()
  return CAPTURE_KIND_CONFIGS.find((config) => config.slash.slice(1) === command)?.kind ?? null
}

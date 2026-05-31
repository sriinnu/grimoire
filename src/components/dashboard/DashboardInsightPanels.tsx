import { useMemo } from 'react'
import type { PulseCommit, VaultEntry } from '../../types'
import { buildDreamForgePrivacyReport, buildDreamForgeSummary } from '../../lib/dreamForge'
import { buildTimeLoomSummary } from '../../lib/timeLoom'
import { buildTimeLoomGuidance } from '../../lib/timeLoomGuidance'
import { DailyThreadRail } from './DailyThreadRail'
import { DreamForgePanel } from './DreamForgePanel'
import { TimeLoomPanel } from './TimeLoomPanel'

interface DashboardInsightPanelsProps {
  crystallizedTodayCount: number
  entries: VaultEntry[]
  onCaptureDream: (date?: Date) => void
  onCaptureJournal: (date?: Date) => void
  onStartAsk: (promptSeed?: string) => void
  pulseCommits: PulseCommit[]
}

/** Lazy dashboard insight lane for private dream patterns and local time graph data. */
export function DashboardInsightPanels({
  crystallizedTodayCount,
  entries,
  onCaptureDream,
  onCaptureJournal,
  onStartAsk,
  pulseCommits,
}: DashboardInsightPanelsProps) {
  const dreamForgeSummary = useMemo(() => buildDreamForgeSummary(entries), [entries])
  const dreamForgePrivacyReport = useMemo(() => buildDreamForgePrivacyReport(entries), [entries])
  const timeLoomSummary = useMemo(
    () => buildTimeLoomSummary(entries, new Date(), { commits: pulseCommits }),
    [entries, pulseCommits],
  )
  const dailyThreadGuidance = useMemo(
    () => buildTimeLoomGuidance(timeLoomSummary, crystallizedTodayCount, dreamForgeSummary),
    [crystallizedTodayCount, dreamForgeSummary, timeLoomSummary],
  )

  return (
    <>
      <TimeLoomPanel
        crystallizedTodayCount={crystallizedTodayCount}
        summary={timeLoomSummary}
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
      />
      <DailyThreadRail
        guidance={dailyThreadGuidance}
        onCaptureDream={() => onCaptureDream()}
        onCaptureJournal={() => onCaptureJournal()}
        onStartAsk={onStartAsk}
      />
      <DreamForgePanel
        privacyReport={dreamForgePrivacyReport}
        summary={dreamForgeSummary}
        onCaptureDream={() => onCaptureDream()}
      />
    </>
  )
}

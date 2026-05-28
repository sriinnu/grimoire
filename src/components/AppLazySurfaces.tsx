import { lazy, Suspense, useEffect, useState, type ComponentProps, type ReactNode } from 'react'
import { isDocumentVisible, scheduleVisibleWork } from '../hooks/visibleDocument'
import type { CloneVaultModal } from './CloneVaultModal'
import type { CommandPalette } from './CommandPalette'
import type { CommitDialog } from './CommitDialog'
import type { ConfirmDeleteDialog } from './ConfirmDeleteDialog'
import type { ConflictResolverModal } from './ConflictResolverModal'
import type { CreateTypeDialog } from './CreateTypeDialog'
import type { CreateVaultDialog } from './CreateVaultDialog'
import type { CreateViewDialog } from './CreateViewDialog'
import type { DashboardRoute } from './dashboard/DashboardRoute'
import type { DeleteProgressNotice } from './DeleteProgressNotice'
import type { FeedbackDialog } from './FeedbackDialog'
import type { GraphModal } from './GraphModal'
import type { McpSetupDialog } from './McpSetupDialog'
import type { NoteRetargetingDialogs } from './note-retargeting/NoteRetargetingDialogs'
import type { PulseView } from './PulseView'
import type { QuickOpenPalette } from './QuickOpenPalette'
import type { RenameDetectedBanner } from './RenameDetectedBanner'
import type { SearchPanel } from './SearchPanel'
import type { SettingsPanel } from './SettingsPanel'
import type { StatusBar } from './StatusBar'
import type { AiAgentsOnboardingPrompt } from './AiAgentsOnboardingPrompt'
import type { AudioRecordingDialog } from './AudioRecordingDialog'
import type { TelemetryConsentDialog } from './TelemetryConsentDialog'
import type { UpdateBanner } from './UpdateBanner'
import type { VaultRebuildProgressNotice } from './VaultRebuildProgressNotice'
import type { WelcomeScreen } from './WelcomeScreen'
import type { WeatherSnapshotDialog } from './WeatherSnapshotDialog'

const CloneVaultModalSurface = lazy(async () => ({ default: (await import('./CloneVaultModal')).CloneVaultModal }))
const CommandPaletteSurface = lazy(async () => ({ default: (await import('./CommandPalette')).CommandPalette }))
const CommitDialogSurface = lazy(async () => ({ default: (await import('./CommitDialog')).CommitDialog }))
const ConfirmDeleteDialogSurface = lazy(async () => ({ default: (await import('./ConfirmDeleteDialog')).ConfirmDeleteDialog }))
const ConflictResolverModalSurface = lazy(async () => ({ default: (await import('./ConflictResolverModal')).ConflictResolverModal }))
const CreateTypeDialogSurface = lazy(async () => ({ default: (await import('./CreateTypeDialog')).CreateTypeDialog }))
const CreateVaultDialogSurface = lazy(async () => ({ default: (await import('./CreateVaultDialog')).CreateVaultDialog }))
const CreateViewDialogSurface = lazy(async () => ({ default: (await import('./CreateViewDialog')).CreateViewDialog }))
const DashboardRouteSurface = lazy(async () => ({ default: (await import('./dashboard/DashboardRoute')).DashboardRoute }))
const DeleteProgressNoticeSurface = lazy(async () => ({ default: (await import('./DeleteProgressNotice')).DeleteProgressNotice }))
const FeedbackDialogSurface = lazy(async () => ({ default: (await import('./FeedbackDialog')).FeedbackDialog }))
const GraphModalSurface = lazy(async () => ({ default: (await import('./GraphModal')).GraphModal }))
const McpSetupDialogSurface = lazy(async () => ({ default: (await import('./McpSetupDialog')).McpSetupDialog }))
const NoteRetargetingDialogsSurface = lazy(async () => ({ default: (await import('./note-retargeting/NoteRetargetingDialogs')).NoteRetargetingDialogs }))
const PulseViewSurface = lazy(async () => ({ default: (await import('./PulseView')).PulseView }))
const QuickOpenPaletteSurface = lazy(async () => ({ default: (await import('./QuickOpenPalette')).QuickOpenPalette }))
const RenameDetectedBannerSurface = lazy(async () => ({ default: (await import('./RenameDetectedBanner')).RenameDetectedBanner }))
const SearchPanelSurface = lazy(async () => ({ default: (await import('./SearchPanel')).SearchPanel }))
const SettingsPanelSurface = lazy(async () => ({ default: (await import('./SettingsPanel')).SettingsPanel }))
const StatusBarSurface = lazy(async () => ({ default: (await import('./StatusBar')).StatusBar }))
const AiAgentsOnboardingPromptSurface = lazy(async () => ({ default: (await import('./AiAgentsOnboardingPrompt')).AiAgentsOnboardingPrompt }))
const AudioRecordingDialogSurface = lazy(async () => ({ default: (await import('./AudioRecordingDialog')).AudioRecordingDialog }))
const TelemetryConsentDialogSurface = lazy(async () => ({ default: (await import('./TelemetryConsentDialog')).TelemetryConsentDialog }))
const UpdateBannerSurface = lazy(async () => ({ default: (await import('./UpdateBanner')).UpdateBanner }))
const VaultRebuildProgressNoticeSurface = lazy(async () => ({ default: (await import('./VaultRebuildProgressNotice')).VaultRebuildProgressNotice }))
const WeatherSnapshotDialogSurface = lazy(async () => ({ default: (await import('./WeatherSnapshotDialog')).WeatherSnapshotDialog }))

type WelcomeScreenSurfaceModule = { default: typeof WelcomeScreen }

let welcomeScreenImport: Promise<WelcomeScreenSurfaceModule> | null = null

function loadWelcomeScreenSurface(): Promise<WelcomeScreenSurfaceModule> {
  welcomeScreenImport ??= import('./WelcomeScreen').then((module) => ({ default: module.WelcomeScreen }))
  return welcomeScreenImport
}

const WelcomeScreenSurface = lazy(loadWelcomeScreenSurface)

function VisibleSurface({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null
  return <Suspense fallback={null}>{children}</Suspense>
}

function ColdRouteSurface({ children }: { children: ReactNode }) {
  return <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>{children}</Suspense>
}

type StatusBarProps = ComponentProps<typeof StatusBar>

function StatusBarFallback({ isGitVault = true, remoteStatus }: Pick<StatusBarProps, 'isGitVault' | 'remoteStatus'>) {
  const showNoRemote = remoteStatus?.hasRemote === false
  const fallbackLabel = isGitVault ? 'No remote' : 'Local only'

  return (
    <footer
      className="status-bar"
      data-testid="status-bar"
      data-status-tone="neutral"
      aria-label="Grimoire status loading"
      style={{
        minHeight: 30,
        height: 30,
        flexShrink: 0,
        background: 'linear-gradient(180deg, color-mix(in srgb, var(--sidebar) 96%, var(--background)), var(--sidebar))',
        borderTop: '1px solid color-mix(in srgb, var(--sidebar-border) 72%, transparent)',
        color: 'var(--status-bar-muted-foreground, color-mix(in srgb, var(--sidebar-foreground) 76%, transparent))',
        display: 'flex',
        alignItems: 'center',
        padding: '0 8px',
      }}
    >
      {!isGitVault || showNoRemote ? (
        <span data-testid={isGitVault ? 'status-no-remote' : 'status-local-only'} style={{ fontSize: 11, fontWeight: 600 }}>
          {fallbackLabel}
        </span>
      ) : null}
    </footer>
  )
}

/** Defers command-palette parsing until the palette is opened. */
export function LazyCommandPalette(props: ComponentProps<typeof CommandPalette>) {
  return (
    <VisibleSurface open={props.open}>
      <CommandPaletteSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers quick-open fuzzy matching UI until the palette is opened. */
export function LazyQuickOpenPalette(props: ComponentProps<typeof QuickOpenPalette>) {
  return (
    <VisibleSurface open={props.open}>
      <QuickOpenPaletteSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers global search parsing until the search panel is opened. */
export function LazySearchPanel(props: ComponentProps<typeof SearchPanel>) {
  return (
    <VisibleSurface open={props.open}>
      <SearchPanelSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers graph rendering dependencies until the graph modal is opened. */
export function LazyGraphModal(props: ComponentProps<typeof GraphModal>) {
  return (
    <VisibleSurface open={props.open}>
      <GraphModalSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers weather snapshot UI until the insert dialog is opened. */
export function LazyWeatherSnapshotDialog(props: ComponentProps<typeof WeatherSnapshotDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <WeatherSnapshotDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers microphone recording UI until the user starts a voice note. */
export function LazyAudioRecordingDialog(props: ComponentProps<typeof AudioRecordingDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <AudioRecordingDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers type creation form dependencies until the dialog is opened. */
export function LazyCreateTypeDialog(props: ComponentProps<typeof CreateTypeDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <CreateTypeDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers vault template creation UI until the dialog is opened. */
export function LazyCreateVaultDialog(props: ComponentProps<typeof CreateVaultDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <CreateVaultDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers view/filter builder dependencies until the dialog is opened. */
export function LazyCreateViewDialog(props: ComponentProps<typeof CreateViewDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <CreateViewDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers commit dialog UI until a Git vault opens the commit flow. */
export function LazyCommitDialog(props: ComponentProps<typeof CommitDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <CommitDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers conflict resolution UI until the resolver is opened. */
export function LazyConflictResolverModal(props: ComponentProps<typeof ConflictResolverModal>) {
  return (
    <VisibleSurface open={props.open}>
      <ConflictResolverModalSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers destructive confirmation UI until a destructive action is pending. */
export function LazyConfirmDeleteDialog(props: ComponentProps<typeof ConfirmDeleteDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <ConfirmDeleteDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers note retargeting dialogs until a type/folder retarget action starts. */
export function LazyNoteRetargetingDialogs(props: ComponentProps<typeof NoteRetargetingDialogs>) {
  return (
    <VisibleSurface open={props.dialogState !== null}>
      <NoteRetargetingDialogsSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers updater banner actions until a release banner is actually visible. */
export function LazyUpdateBanner(props: ComponentProps<typeof UpdateBanner>) {
  const visible = props.status.state !== 'idle' && props.status.state !== 'error'
  return (
    <VisibleSurface open={visible}>
      <UpdateBannerSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers rename-repair banner UI until external renames are detected. */
export function LazyRenameDetectedBanner(props: ComponentProps<typeof RenameDetectedBanner>) {
  return (
    <VisibleSurface open={props.renames.length > 0}>
      <RenameDetectedBannerSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers delete-progress toast UI until a delete batch is active. */
export function LazyDeleteProgressNotice(props: ComponentProps<typeof DeleteProgressNotice>) {
  return (
    <VisibleSurface open={props.count > 0}>
      <DeleteProgressNoticeSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers rebuild-progress UI until a vault rebuild is active. */
export function LazyVaultRebuildProgressNotice(props: ComponentProps<typeof VaultRebuildProgressNotice>) {
  return (
    <VisibleSurface open={props.progress !== null}>
      <VaultRebuildProgressNoticeSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers settings UI until the settings panel is opened. */
export function LazySettingsPanel(props: ComponentProps<typeof SettingsPanel>) {
  return (
    <VisibleSurface open={props.open}>
      <SettingsPanelSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers status-bar menus and badges out of the first startup bundle while preserving footer height. */
export function LazyStatusBar(props: ComponentProps<typeof StatusBar>) {
  const [ready, setReady] = useState(() => isDocumentVisible())

  useEffect(() => {
    if (ready) return
    return scheduleVisibleWork(() => setReady(true))
  }, [ready])

  if (!ready) {
    return <StatusBarFallback isGitVault={props.isGitVault} remoteStatus={props.remoteStatus} />
  }

  return (
    <Suspense fallback={<StatusBarFallback isGitVault={props.isGitVault} remoteStatus={props.remoteStatus} />}>
      <StatusBarSurface {...props} />
    </Suspense>
  )
}

/** Defers the first-run telemetry consent screen after normal app startup. */
export function LazyTelemetryConsentDialog(props: ComponentProps<typeof TelemetryConsentDialog>) {
  useEffect(() => {
    void loadWelcomeScreenSurface()
  }, [])

  return (
    <ColdRouteSurface>
      <TelemetryConsentDialogSurface {...props} />
    </ColdRouteSurface>
  )
}

/** Defers the welcome/onboarding route until a vault-less startup needs it. */
export function LazyWelcomeScreen(props: ComponentProps<typeof WelcomeScreen>) {
  return (
    <ColdRouteSurface>
      <WelcomeScreenSurface {...props} />
    </ColdRouteSurface>
  )
}

/** Defers the assistant dashboard, daily-flow summaries, and capture planner until Dashboard is selected. */
export function LazyDashboardRoute(props: ComponentProps<typeof DashboardRoute>) {
  return (
    <ColdRouteSurface>
      <DashboardRouteSurface {...props} />
    </ColdRouteSurface>
  )
}

/** Defers AI-agent setup cards until onboarding blocks on missing local agents. */
export function LazyAiAgentsOnboardingPrompt(props: ComponentProps<typeof AiAgentsOnboardingPrompt>) {
  return (
    <ColdRouteSurface>
      <AiAgentsOnboardingPromptSurface {...props} />
    </ColdRouteSurface>
  )
}

/** Defers feedback UI until the feedback dialog is opened. */
export function LazyFeedbackDialog(props: ComponentProps<typeof FeedbackDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <FeedbackDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers MCP setup UI until the setup dialog is opened. */
export function LazyMcpSetupDialog(props: ComponentProps<typeof McpSetupDialog>) {
  return (
    <VisibleSurface open={props.open}>
      <McpSetupDialogSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers clone-vault UI until the clone dialog is opened. */
export function LazyCloneVaultModal(props: ComponentProps<typeof CloneVaultModal>) {
  return (
    <VisibleSurface open={props.open}>
      <CloneVaultModalSurface {...props} />
    </VisibleSurface>
  )
}

/** Defers Pulse history dependencies until the Pulse view is selected. */
export function LazyPulseView(props: ComponentProps<typeof PulseView>) {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-muted-foreground">Loading pulse...</div>}>
      <PulseViewSurface {...props} />
    </Suspense>
  )
}

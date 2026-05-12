import { lazy, Suspense, type ComponentProps, type ReactNode } from 'react'
import type { CloneVaultModal } from './CloneVaultModal'
import type { CommandPalette } from './CommandPalette'
import type { ConflictResolverModal } from './ConflictResolverModal'
import type { FeedbackDialog } from './FeedbackDialog'
import type { GraphModal } from './GraphModal'
import type { McpSetupDialog } from './McpSetupDialog'
import type { PulseView } from './PulseView'
import type { SearchPanel } from './SearchPanel'
import type { SettingsPanel } from './SettingsPanel'
import type { WeatherSnapshotDialog } from './WeatherSnapshotDialog'

const CloneVaultModalSurface = lazy(async () => ({ default: (await import('./CloneVaultModal')).CloneVaultModal }))
const CommandPaletteSurface = lazy(async () => ({ default: (await import('./CommandPalette')).CommandPalette }))
const ConflictResolverModalSurface = lazy(async () => ({ default: (await import('./ConflictResolverModal')).ConflictResolverModal }))
const FeedbackDialogSurface = lazy(async () => ({ default: (await import('./FeedbackDialog')).FeedbackDialog }))
const GraphModalSurface = lazy(async () => ({ default: (await import('./GraphModal')).GraphModal }))
const McpSetupDialogSurface = lazy(async () => ({ default: (await import('./McpSetupDialog')).McpSetupDialog }))
const PulseViewSurface = lazy(async () => ({ default: (await import('./PulseView')).PulseView }))
const SearchPanelSurface = lazy(async () => ({ default: (await import('./SearchPanel')).SearchPanel }))
const SettingsPanelSurface = lazy(async () => ({ default: (await import('./SettingsPanel')).SettingsPanel }))
const WeatherSnapshotDialogSurface = lazy(async () => ({ default: (await import('./WeatherSnapshotDialog')).WeatherSnapshotDialog }))

function VisibleSurface({ open, children }: { open: boolean; children: ReactNode }) {
  if (!open) return null
  return <Suspense fallback={null}>{children}</Suspense>
}

/** Defers command-palette parsing until the palette is opened. */
export function LazyCommandPalette(props: ComponentProps<typeof CommandPalette>) {
  return (
    <VisibleSurface open={props.open}>
      <CommandPaletteSurface {...props} />
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

/** Defers conflict resolution UI until the resolver is opened. */
export function LazyConflictResolverModal(props: ComponentProps<typeof ConflictResolverModal>) {
  return (
    <VisibleSurface open={props.open}>
      <ConflictResolverModalSurface {...props} />
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

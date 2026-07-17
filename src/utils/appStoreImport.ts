import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

export type DiscoveredAppSupport = 'full' | 'detected-only'

/** Apps whose local databases Grimoire can import directly. */
export type InstalledAppDatabaseId = 'bear' | 'day-one'

export interface DiscoveredApp {
  id: string
  name: string
  installed: boolean
  store_found: boolean
  store_path?: string | null
  support: DiscoveredAppSupport
}

export interface BearDatabaseImportSummary {
  source_store: string
  imported_root: string
  report_path?: string | null
  notes_imported: number
  skipped_trashed: number
  skipped_encrypted: number
  failed_notes: number
  sample_titles: string[]
  dry_run: boolean
}

/** Lists installed apps whose local data stores Grimoire can import directly. */
export function discoverImportableApps(): Promise<DiscoveredApp[]> {
  return isTauri()
    ? invoke<DiscoveredApp[]>('discover_importable_apps')
    : mockInvoke<DiscoveredApp[]>('discover_importable_apps')
}

/** Imports (or dry-runs) notes straight from a snapshotted Bear SQLite store. */
export function importBearDatabase(
  vaultPath: string,
  storePath: string,
  dryRun: boolean,
): Promise<BearDatabaseImportSummary> {
  const args = { vaultPath, storePath, dryRun }
  return isTauri()
    ? invoke<BearDatabaseImportSummary>('import_bear_database', args)
    : mockInvoke<BearDatabaseImportSummary>('import_bear_database', args)
}

export interface DayOneDatabaseImportSummary {
  source_store: string
  imported_root: string
  report_path?: string | null
  entries_imported: number
  skipped_empty: number
  skipped_trashed: number
  failed_entries: number
  journals: string[]
  sample_titles: string[]
  dry_run: boolean
}

/** Imports (or dry-runs) journal entries straight from a snapshotted Day One SQLite store. */
export function importDayOneDatabase(
  vaultPath: string,
  storePath: string,
  dryRun: boolean,
): Promise<DayOneDatabaseImportSummary> {
  const args = { vaultPath, storePath, dryRun }
  return isTauri()
    ? invoke<DayOneDatabaseImportSummary>('import_day_one_database', args)
    : mockInvoke<DayOneDatabaseImportSummary>('import_day_one_database', args)
}

/** Builds concise user feedback for a Day One database import or dry run. */
export function formatDayOneDatabaseSummaryToast(summary: DayOneDatabaseImportSummary): string {
  const entryLabel = summary.entries_imported === 1 ? 'entry' : 'entries'
  const skippedParts = [
    summary.skipped_empty > 0 ? `${summary.skipped_empty} empty` : null,
    summary.skipped_trashed > 0 ? `${summary.skipped_trashed} trashed` : null,
  ].filter(Boolean)
  const skippedPart = skippedParts.length > 0 ? `, skipped ${skippedParts.join(' and ')}` : ''
  const failurePart = summary.failed_entries > 0 ? `; ${summary.failed_entries} failed` : ''
  if (summary.dry_run) {
    return `Preview: ${summary.entries_imported} ${entryLabel} from the Day One database${skippedPart}; local-only report will be written`
  }
  return `Imported ${summary.entries_imported} ${entryLabel} from the Day One database${skippedPart}${failurePart}`
}

/** Builds concise user feedback for a Bear database import or dry run. */
export function formatBearDatabaseSummaryToast(summary: BearDatabaseImportSummary): string {
  const noteLabel = summary.notes_imported === 1 ? 'note' : 'notes'
  const skippedParts = [
    summary.skipped_trashed > 0 ? `${summary.skipped_trashed} trashed` : null,
    summary.skipped_encrypted > 0 ? `${summary.skipped_encrypted} encrypted` : null,
  ].filter(Boolean)
  const skippedPart = skippedParts.length > 0 ? `, skipped ${skippedParts.join(' and ')}` : ''
  const failurePart = summary.failed_notes > 0 ? `; ${summary.failed_notes} failed` : ''
  if (summary.dry_run) {
    return `Preview: ${summary.notes_imported} ${noteLabel} from the Bear database${skippedPart}; local-only report will be written`
  }
  return `Imported ${summary.notes_imported} ${noteLabel} from the Bear database${skippedPart}${failurePart}`
}

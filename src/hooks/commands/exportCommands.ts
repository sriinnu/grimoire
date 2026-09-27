import type { VaultEntry } from '../../types'
import type { CommandAction } from './types'

interface ExportCommandsConfig {
  hasActiveNote: boolean
  activeEntry: Pick<VaultEntry, 'path' | 'title'> | undefined
  /** Optional: report the outcome. Falls back to a console line so a failure is never silent. */
  onNotify?: (message: string) => void
}

/** Export the open note. Both commands load their code on first use, not at boot. */
export function buildExportCommands({ hasActiveNote, activeEntry, onNotify }: ExportCommandsConfig): CommandAction[] {
  const notify = onNotify ?? ((message: string) => console.info(`[export] ${message}`))
  return [
    {
      id: 'export-html',
      label: 'Export as HTML…',
      group: 'Page',
      keywords: ['export', 'html', 'share', 'save as', 'web page', 'standalone'],
      enabled: hasActiveNote && !!activeEntry,
      execute: () => {
        if (!activeEntry) return
        void import('../../lib/exportNote/exportNote')
          .then(({ exportNoteAsHtml }) => exportNoteAsHtml(activeEntry))
          .then((outcome) => {
            if (outcome.status === 'saved') notify(`Exported to ${outcome.path}`)
            else if (outcome.status === 'downloaded') notify(`Downloaded ${outcome.filename}`)
          })
          .catch((error: unknown) => notify(`Export failed: ${error instanceof Error ? error.message : String(error)}`))
      },
    },
    {
      id: 'print-note',
      label: 'Print / Save as PDF…',
      group: 'Page',
      keywords: ['print', 'pdf', 'export', 'paper', 'save as pdf'],
      enabled: hasActiveNote,
      execute: () => {
        void import('../../lib/exportNote/exportNote').then(({ printCurrentNote }) => printCurrentNote())
      },
    },
  ]
}

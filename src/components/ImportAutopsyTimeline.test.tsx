import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImportAutopsyTimeline } from './ImportAutopsyTimeline'
import type { ImportAutopsyPreviewState } from '../lib/vaultPortability'

const preview: ImportAutopsyPreviewState = {
  sourceId: 'day-one-preview',
  result: {
    source_path: '/Users/sri/Private/DayOneExport.zip',
    planned_import_root: '/Users/sri/Vault/imports/day-one',
    notes_to_copy: 4,
    assets_to_copy: 2,
    skipped_files: 1,
    failed_files: 0,
    writes_local_only_report: true,
  },
}

describe('ImportAutopsyTimeline', () => {
  it('renders the last no-write preview as a compact local timeline', () => {
    render(<ImportAutopsyTimeline preview={preview} vaultPath="/Users/sri/Vault" />)

    const timeline = screen.getByTestId('import-autopsy-timeline')
    expect(timeline).toHaveTextContent('Import Autopsy')
    expect(timeline).toHaveTextContent('No writes yet')
    expect(timeline).toHaveAttribute('aria-label', 'Import Autopsy preview for Day One')
    expect(timeline).toHaveClass('grimoire-import-autopsy')
    expect(screen.getByRole('list', { name: 'Import preview steps' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Day One import preview ready: 4 notes, 2 assets; 1 skipped file; 0 failed previews.',
    )
    expect(timeline).toHaveTextContent('Day One selected: DayOneExport.zip')
    expect(timeline).toHaveTextContent('Will land in ./imports/day-one')
    expect(timeline).toHaveTextContent('4 notes')
    expect(timeline).toHaveTextContent('2 assets')
    expect(timeline).toHaveTextContent('1 skipped file; 0 failed previews.')
    expect(timeline).toHaveTextContent('A local-only report will stay inside the vault import lane.')
    expect(timeline).not.toHaveTextContent('/Users/sri/Private')
  })

  it('stages preview steps with the import-autopsy primitive', () => {
    render(<ImportAutopsyTimeline preview={preview} vaultPath="/Users/sri/Vault" />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(7)
    expect(items[0]).toHaveClass('grimoire-import-autopsy__step')
    expect(items[0]).toHaveStyle({ '--motion-stagger-delay': '0ms' })
    expect(items[6]).toHaveClass('grimoire-import-autopsy__step')
    expect(items[6]).toHaveStyle({ '--motion-stagger-delay': '210ms' })
  })

  it('marks the timeline as refreshing while a newer preview is running', () => {
    render(<ImportAutopsyTimeline preview={preview} vaultPath="/Users/sri/Vault" isRefreshing />)

    expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A newer import preview is running.')
  })

  it('warns when a preview destination is outside the active vault', () => {
    render(
      <ImportAutopsyTimeline
        preview={{
          ...preview,
          result: {
            ...preview.result,
            planned_import_root: '/Users/sri/OtherVault/imports/day-one',
          },
        }}
        vaultPath="/Users/sri/Vault"
      />,
    )

    const destination = screen.getByText('Warning: planned destination is outside the active vault (day-one).')
    expect(destination.closest('li')).toHaveAttribute('data-tone', 'warn')
    expect(screen.getByText('Local-only report is planned, but destination is outside the active vault.')).toBeInTheDocument()
  })

  it('compacts Windows-style paths without leaking full directories', () => {
    render(
      <ImportAutopsyTimeline
        preview={{
          sourceId: 'bear-preview',
          result: {
            ...preview.result,
            source_path: 'C:\\Users\\sri\\Private\\Bear Export',
            planned_import_root: 'C:\\Users\\sri\\Vault\\imports\\bear',
            skipped_files: 0,
            failed_files: 0,
          },
        }}
        vaultPath="C:\\Users\\sri\\Vault"
      />,
    )

    const timeline = screen.getByTestId('import-autopsy-timeline')
    expect(timeline).toHaveTextContent('Bear export selected: Bear Export')
    expect(timeline).toHaveTextContent('Will land in ./imports/bear')
    expect(timeline).not.toHaveTextContent('C:\\Users\\sri\\Private')
  })

  it('does not render when there is no preview', () => {
    render(<ImportAutopsyTimeline preview={null} />)

    expect(screen.queryByTestId('import-autopsy-timeline')).not.toBeInTheDocument()
  })
})

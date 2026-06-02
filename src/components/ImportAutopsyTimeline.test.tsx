import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
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
    preview_signature: 'import-preview-v1:test',
  },
}

describe('ImportAutopsyTimeline', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'clipboard')
    vi.restoreAllMocks()
  })

  it('renders the last no-write preview as a compact local timeline', () => {
    render(<ImportAutopsyTimeline preview={preview} vaultPath="/Users/sri/Vault" />)

    const timeline = screen.getByTestId('import-autopsy-timeline')
    expect(timeline).toHaveTextContent('Review gate')
    expect(timeline).toHaveTextContent('Import Autopsy')
    expect(timeline).toHaveTextContent('No writes yet')
    expect(timeline).toHaveAttribute('aria-label', 'Import Autopsy preview for Day One')
    expect(timeline).toHaveClass('grimoire-import-autopsy')
    expect(screen.getByRole('list', { name: 'Import preview steps' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Day One import preview ready: 4 notes, 2 assets; 1 skipped file; 0 failed previews.',
    )
    expect(screen.getByTestId('import-autopsy-copy-status')).toHaveTextContent('Copies the redacted no-write manifest only.')
    expect(screen.getByTestId('import-autopsy-review-gate')).toHaveTextContent(
      'Review the exact rows below before importing. Full source paths and local reports stay on this device.',
    )
    const manifest = screen.getByTestId('import-autopsy-manifest')
    expect(manifest).toHaveAccessibleName('Source-safe import manifest')
    expect(manifest).toHaveTextContent('Files')
    expect(manifest).toHaveTextContent('Metadata')
    expect(manifest).toHaveTextContent('Attachments')
    expect(manifest).toHaveTextContent('Withheld')
    expect(manifest).toHaveTextContent('1 guarded item')
    expect(manifest).toHaveTextContent('Source metadata becomes visible Markdown/frontmatter, not hidden state.')
    expect(timeline).toHaveTextContent('Day One selected: DayOneExport.zip')
    expect(timeline).toHaveTextContent('Will land in ./imports/day-one')
    expect(timeline).toHaveTextContent('4 notes queued for Markdown copy.')
    expect(timeline).toHaveTextContent('2 assets queued beside imported notes.')
    expect(timeline).toHaveTextContent('1 skipped file; 0 failed previews. Skipped or failed content will not be imported silently.')
    expect(timeline).toHaveTextContent('A local-only report will stay inside the vault import lane.')
    expect(timeline).not.toHaveTextContent('/Users/sri/Private')
  })

  it('stages preview steps with the import-autopsy primitive', () => {
    render(<ImportAutopsyTimeline preview={preview} vaultPath="/Users/sri/Vault" />)

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(7)
    expect(items[0]).toHaveClass('grimoire-import-autopsy__step')
    expect(items[0]).toHaveStyle({ '--motion-stagger-delay': '0ms' })
    expect(items[0].querySelector('.grimoire-import-autopsy__value')).toBeInTheDocument()
    expect(items[6]).toHaveClass('grimoire-import-autopsy__step')
    expect(items[6]).toHaveStyle({ '--motion-stagger-delay': '210ms' })
  })

  it('marks the timeline as refreshing while a newer preview is running', () => {
    render(<ImportAutopsyTimeline preview={preview} vaultPath="/Users/sri/Vault" isRefreshing />)

    expect(screen.getByText('Refreshing...')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('A newer import preview is running.')
  })

  it('shows exact source-to-destination manifest rows without leaking absolute paths', () => {
    render(
      <ImportAutopsyTimeline
        preview={{
          ...preview,
          result: {
            ...preview.result,
            manifest_rows: [
              {
                kind: 'note',
                source_path: '/Users/sri/Private/DayOneExport/entries/entry.json',
                destination_path: '/Users/sri/Vault/imports/day-one/2026-05-26.md',
                detail: 'title/date/frontmatter from /Users/sri/Private/DayOneExport/entries/entry.json',
              },
              {
                kind: 'asset',
                source_path: '/Users/sri/Private/DayOneExport/photos/moon.png',
                destination_path: '/Users/sri/Vault/imports/day-one/assets/moon.png',
                detail: 'attachment move',
              },
              {
                kind: 'withheld',
                source_path: '/Users/sri/Private/DayOneExport/.env',
                destination_path: null,
                detail: 'local-only skip from /Users/sri/Private/DayOneExport/.env',
              },
            ],
          },
        }}
        vaultPath="/Users/sri/Vault"
      />,
    )

    const manifest = screen.getByTestId('import-autopsy-exact-manifest')
    expect(manifest).toHaveAccessibleName('Exact redacted import manifest')
    expect(manifest).toHaveTextContent('entry.json -> ./imports/day-one/2026-05-26.md')
    expect(manifest).toHaveTextContent('moon.png -> ./imports/day-one/assets/moon.png')
    expect(manifest).toHaveTextContent('.env -> withheld')
    expect(manifest).toHaveTextContent('title/date/frontmatter from entry.json')
    expect(manifest).not.toHaveTextContent('/Users/sri/Private')
    expect(manifest.querySelector('[data-tone="warn"]')).not.toBeNull()
  })

  it('discloses when the exact manifest is redacted to a visible sample', () => {
    render(
      <ImportAutopsyTimeline
        preview={{
          ...preview,
          result: {
            ...preview.result,
            manifest_rows: Array.from({ length: 10 }, (_value, index) => ({
              kind: 'note' as const,
              source_path: `/Users/sri/Private/DayOneExport/entries/entry-${index}.json`,
              destination_path: `/Users/sri/Vault/imports/day-one/entry-${index}.md`,
              detail: `title/date/frontmatter from /Users/sri/Private/DayOneExport/entries/entry-${index}.json`,
            })),
          },
        }}
        vaultPath="/Users/sri/Vault"
      />,
    )

    const manifest = screen.getByTestId('import-autopsy-exact-manifest')
    expect(manifest).toHaveTextContent('Showing first 8 of 10 redacted rows. Full absolute-path report stays local-only.')
    expect(manifest).toHaveTextContent('entry-7.json -> ./imports/day-one/entry-7.md')
    expect(manifest).not.toHaveTextContent('entry-8.json')
    expect(manifest).not.toHaveTextContent('/Users/sri/Private')
  })

  it('copies a redacted portable Markdown manifest without leaking absolute source paths', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    })

    render(
      <ImportAutopsyTimeline
        preview={{
          ...preview,
          result: {
            ...preview.result,
            manifest_rows: [
              {
                kind: 'note',
                source_path: '/Users/sri/Private/DayOneExport/entries/entry.json',
                destination_path: '/Users/sri/Vault/imports/day-one/2026-05-26.md',
                detail: 'title/date/frontmatter from /Users/sri/Private/DayOneExport/entries/entry.json',
              },
              {
                kind: 'withheld',
                source_path: '/Users/sri/Private/DayOneExport/.env',
                destination_path: null,
                detail: 'local-only skip from /Users/sri/Private/DayOneExport/.env',
              },
            ],
          },
        }}
        vaultPath="/Users/sri/Vault"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Copy manifest' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledOnce())
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).toContain('# Import Autopsy Manifest')
    expect(copied).toContain('Source: Day One')
    expect(copied).toContain('Review gate: inspect this manifest before importing or applying changes.')
    expect(copied).toContain('Note: entry.json -> ./imports/day-one/2026-05-26.md')
    expect(copied).toContain('Withheld: .env -> withheld; local-only skip from .env')
    expect(copied).toContain('Original import reports with absolute source paths stay local-only.')
    expect(copied).not.toContain('/Users/sri/Private')
    expect(screen.getByTestId('import-autopsy-copy-manifest')).toHaveTextContent('Copied')
    expect(screen.getByTestId('import-autopsy-copy-status')).toHaveTextContent('Redacted manifest copied locally.')
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

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { PortabilityExportPreviewState } from '../lib/exportReviewGate'
import { createTranslator } from '../lib/i18n'
import type { ImportAutopsyPreviewState } from '../lib/vaultPortability'
import { PortabilityActionDeck } from './PortabilityActionDeck'

const importPreview: ImportAutopsyPreviewState = {
  sourceId: 'day-one-preview',
  result: {
    assets_to_copy: 0,
    failed_files: 0,
    notes_to_copy: 1,
    planned_import_root: '/Users/sri/Vault/imports/day-one',
    preview_signature: 'import-preview-v1:day-one',
    skipped_files: 0,
    source_path: '/Users/sri/Downloads/DayOne.zip',
    writes_local_only_report: true,
  },
}

const exportPreview: PortabilityExportPreviewState = {
  format: 'json',
  result: {
    assets_exportable: 0,
    bytes_exportable: 42,
    files_exportable: 1,
    format: 'json',
    locality_proof: {
      absolute_source_paths_redacted: true,
      local_only_files_withheld: 0,
      markdown_source_of_truth: true,
    },
    manifest_rows: [],
    notes_exportable: 1,
    preview_signature: 'capsule-preview-v1:json',
    skipped_files: 0,
  },
}

describe('PortabilityActionDeck reviewed state routing', () => {
  it('opens the journal lane when a journal import preview is reviewed', () => {
    render(
      <PortabilityActionDeck
        t={createTranslator('en')}
        vaultReady={true}
        busyAction={null}
        importPreview={importPreview}
      />,
    )

    expect(screen.getByTestId('settings-portability-lane-journals')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('Preview Day One')).toBeInTheDocument()
    expect(screen.queryByText('Preview Obsidian')).not.toBeInTheDocument()
  })

  it('opens the export lane when a capsule export preview is reviewed', () => {
    render(
      <PortabilityActionDeck
        t={createTranslator('en')}
        vaultReady={true}
        busyAction={null}
        exportPreview={exportPreview}
      />,
    )

    expect(screen.getByTestId('settings-portability-lane-export')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('settings-export-preview-summary')).toHaveTextContent('Reviewed preview')
    expect(screen.queryByText('Preview Bear')).not.toBeInTheDocument()
  })

  it('keeps capsule import busy copy separate from preview copy', () => {
    render(
      <PortabilityActionDeck
        t={createTranslator('en')}
        vaultReady={true}
        busyAction="json-capsule"
      />,
    )

    expect(screen.getByTestId('settings-import-json-capsule')).toHaveTextContent('Importing...')
    expect(screen.getByTestId('settings-import-json-capsule')).not.toHaveTextContent('Previewing...')
  })

  it('keeps capsule export preview busy copy separate from export copy', () => {
    render(
      <PortabilityActionDeck
        t={createTranslator('en')}
        vaultReady={true}
        busyAction="export-json-preview"
      />,
    )

    expect(screen.getByTestId('settings-preview-json-snapshot')).toHaveTextContent('Previewing...')
    expect(screen.getByTestId('settings-preview-json-snapshot')).not.toHaveTextContent('Exporting...')
  })
})

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { PortabilitySettingsSection } from './PortabilitySettingsSection'

describe('PortabilitySettingsSection', () => {
  it('surfaces import, export, storage, and second-brain lanes', () => {
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        vaultPath="/Users/sri/Library/Mobile Documents/com~apple~CloudDocs/Grimoire"
      />,
    )

    expect(screen.getByTestId('settings-portability-section')).toBeInTheDocument()
    expect(screen.getByTestId('settings-storage-health')).toBeInTheDocument()
    expect(screen.getByText('Bear')).toBeInTheDocument()
    expect(screen.getAllByText('Git remote')).toHaveLength(2)
    expect(screen.getByText('iCloud Drive')).toBeInTheDocument()
    expect(screen.getByText('Amazon S3')).toBeInTheDocument()
    expect(screen.getByText('Journal capture')).toBeInTheDocument()
    expect(screen.getByText('Memory graph')).toBeInTheDocument()
    expect(screen.getByText(/Current vault is inside iCloud Drive/)).toBeInTheDocument()
  })

  it('runs the import actions when available', async () => {
    const onImportMarkdownFolder = vi.fn()
    const onImportMarkdownZip = vi.fn()
    const onImportBear = vi.fn()
    const onImportDayOne = vi.fn()
    const onImportJourney = vi.fn()
    const onExportMarkdownZip = vi.fn()
    render(
      <PortabilitySettingsSection
        t={createTranslator('en')}
        onImportMarkdownFolder={onImportMarkdownFolder}
        onImportMarkdownZip={onImportMarkdownZip}
        onImportBear={onImportBear}
        onImportDayOne={onImportDayOne}
        onImportJourney={onImportJourney}
        onExportMarkdownZip={onExportMarkdownZip}
      />,
    )

    fireEvent.click(screen.getByTestId('settings-import-markdown-folder'))
    fireEvent.click(screen.getByTestId('settings-import-markdown-zip'))
    fireEvent.click(screen.getByTestId('settings-import-bear'))
    fireEvent.click(screen.getByTestId('settings-import-day-one'))
    fireEvent.click(screen.getByTestId('settings-import-journey'))
    fireEvent.click(screen.getByTestId('settings-export-markdown-zip'))

    expect(onImportMarkdownFolder).toHaveBeenCalledTimes(1)
    expect(onImportMarkdownZip).toHaveBeenCalledTimes(1)
    expect(onImportBear).toHaveBeenCalledTimes(1)
    expect(onImportDayOne).toHaveBeenCalledTimes(1)
    expect(onImportJourney).toHaveBeenCalledTimes(1)
    expect(onExportMarkdownZip).toHaveBeenCalledTimes(1)
  })
})

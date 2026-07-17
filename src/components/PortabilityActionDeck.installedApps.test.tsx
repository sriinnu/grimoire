import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DiscoveredApp } from '../utils/appStoreImport'
import { createTranslator } from '../lib/i18n'
import { PortabilityActionDeck } from './PortabilityActionDeck'

const bearWithStore: DiscoveredApp = {
  id: 'bear',
  name: 'Bear',
  installed: true,
  store_found: true,
  store_path: '/Users/sri/Library/Group Containers/9K33E3U3T4.net.shinyfrog.bear/Application Data/database.sqlite',
  support: 'full',
}

const dayOneWithStore: DiscoveredApp = {
  id: 'day-one',
  name: 'Day One',
  installed: true,
  store_found: true,
  store_path: '/Users/sri/Library/Group Containers/5U8NS4GX82.dayoneapp2/Data/Documents/DayOne.sqlite',
  support: 'full',
}

const appleNotesDetected: DiscoveredApp = {
  id: 'apple-notes',
  name: 'Apple Notes',
  installed: true,
  store_found: true,
  store_path: '/Users/sri/Library/Group Containers/group.com.apple.notes/NoteStore.sqlite',
  support: 'detected-only',
}

const notInstalled: DiscoveredApp = {
  ...bearWithStore,
  installed: false,
  store_found: false,
  store_path: null,
}

function renderDeck(installedApps: DiscoveredApp[], handlers?: {
  onPreviewBearDatabase?: (appId?: string) => void
  onImportBearDatabase?: (appId?: string) => void
}) {
  return render(
    <PortabilityActionDeck
      t={createTranslator('en')}
      vaultReady={true}
      busyAction={null}
      installedApps={installedApps}
      onPreviewBearDatabase={handlers?.onPreviewBearDatabase}
      onImportBearDatabase={handlers?.onImportBearDatabase}
    />,
  )
}

describe('PortabilityActionDeck installed apps group', () => {
  it('renders the group with wired Bear database buttons', () => {
    const onPreviewBearDatabase = vi.fn()
    const onImportBearDatabase = vi.fn()
    renderDeck([bearWithStore, appleNotesDetected], { onPreviewBearDatabase, onImportBearDatabase })

    expect(screen.getByTestId('settings-portability-installed-apps')).toBeInTheDocument()
    expect(screen.getByText('Installed apps')).toBeInTheDocument()
    expect(screen.getByTestId('settings-installed-app-status-bear')).toHaveTextContent('Store found')
    expect(screen.getByTestId('settings-installed-app-status-apple-notes'))
      .toHaveTextContent('Detected — import coming soon')

    fireEvent.click(screen.getByTestId('settings-preview-bear-database'))
    expect(onPreviewBearDatabase).toHaveBeenCalledExactlyOnceWith('bear')
    fireEvent.click(screen.getByTestId('settings-import-bear-database'))
    expect(onImportBearDatabase).toHaveBeenCalledExactlyOnceWith('bear')
  })

  it('offers wired Day One database buttons when its store was found', () => {
    const onPreviewBearDatabase = vi.fn()
    const onImportBearDatabase = vi.fn()
    renderDeck([dayOneWithStore], { onPreviewBearDatabase, onImportBearDatabase })

    expect(screen.getByTestId('settings-installed-app-status-day-one')).toHaveTextContent('Store found')
    expect(screen.getByText('Preview Day One database')).toBeInTheDocument()
    expect(screen.getByText('Import Day One database')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('settings-preview-day-one-database'))
    expect(onPreviewBearDatabase).toHaveBeenCalledExactlyOnceWith('day-one')
    fireEvent.click(screen.getByTestId('settings-import-day-one-database'))
    expect(onImportBearDatabase).toHaveBeenCalledExactlyOnceWith('day-one')
  })

  it('shows not-installed status without direct import buttons', () => {
    renderDeck([
      notInstalled,
      { ...dayOneWithStore, installed: false, store_found: false, store_path: null },
      { ...appleNotesDetected, installed: false, store_found: false, store_path: null },
    ])

    expect(screen.getByTestId('settings-installed-app-status-bear')).toHaveTextContent('Not installed')
    expect(screen.getByTestId('settings-installed-app-status-day-one')).toHaveTextContent('Not installed')
    expect(screen.getByTestId('settings-installed-app-status-apple-notes')).toHaveTextContent('Not installed')
    expect(screen.queryByTestId('settings-preview-bear-database')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-import-bear-database')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-preview-day-one-database')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-import-day-one-database')).not.toBeInTheDocument()
  })

  it('never offers direct import for detected-only apps even with a store', () => {
    renderDeck([appleNotesDetected])

    expect(screen.queryByTestId('settings-preview-bear-database')).not.toBeInTheDocument()
    expect(screen.queryByTestId('settings-import-bear-database')).not.toBeInTheDocument()
  })

  it('hides the group entirely when discovery returned nothing', () => {
    renderDeck([])

    expect(screen.queryByTestId('settings-portability-installed-apps')).not.toBeInTheDocument()
  })

  it('shows busy copy while the Bear database import runs', () => {
    render(
      <PortabilityActionDeck
        t={createTranslator('en')}
        vaultReady={true}
        busyAction="bear-db"
        installedApps={[bearWithStore]}
        onPreviewBearDatabase={vi.fn()}
        onImportBearDatabase={vi.fn()}
      />,
    )

    expect(screen.getByTestId('settings-import-bear-database')).toHaveTextContent('Importing...')
    expect(screen.getByTestId('settings-preview-bear-database')).toBeDisabled()
  })

  it('shows busy copy while the Day One database import runs', () => {
    render(
      <PortabilityActionDeck
        t={createTranslator('en')}
        vaultReady={true}
        busyAction="day-one-db"
        installedApps={[dayOneWithStore]}
        onPreviewBearDatabase={vi.fn()}
        onImportBearDatabase={vi.fn()}
      />,
    )

    expect(screen.getByTestId('settings-import-day-one-database')).toHaveTextContent('Importing...')
    expect(screen.getByTestId('settings-preview-day-one-database')).toBeDisabled()
  })

  it('keeps the renamed manual Bear backup folder buttons in the import group', () => {
    renderDeck([bearWithStore])

    expect(screen.getByText('Preview Bear backup folder')).toBeInTheDocument()
    expect(screen.getByText('Import Bear backup folder')).toBeInTheDocument()
  })
})

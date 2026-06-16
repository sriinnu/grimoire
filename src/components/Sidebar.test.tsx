import { render, screen, fireEvent, within } from '@testing-library/react'
import { afterEach, describe, it, expect, vi } from 'vitest'
import { Sidebar } from './Sidebar'
import type { VaultEntry, SidebarSelection } from '../types'

const originalUserAgent = navigator.userAgent
const originalPlatform = navigator.platform

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function setPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

const mockEntries: VaultEntry[] = [
  {
    path: '/vault/project/build-app.md',
    filename: 'build-app.md',
    title: 'Build Grimoire App',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    owner: 'Sriinu',
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 1024,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/responsibility/grow-newsletter.md',
    filename: 'grow-newsletter.md',
    title: 'Grow Newsletter',
    isA: 'Responsibility',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    owner: 'Sriinu',
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 512,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/experiment/stock-screener.md',
    filename: 'stock-screener.md',
    title: 'Stock Screener',
    isA: 'Experiment',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    owner: 'Sriinu',
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 256,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/procedure/weekly-essays.md',
    filename: 'weekly-essays.md',
    title: 'Write Weekly Essays',
    isA: 'Procedure',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: 'Active',
    owner: 'Sriinu',
    cadence: 'Weekly',
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 128,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/topic/software-development.md',
    filename: 'software-development.md',
    title: 'Software Development',
    isA: 'Topic',
    aliases: ['Dev', 'Coding'],
    belongsTo: [],
    relatedTo: [],
    status: null,
    owner: null,
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 256,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/topic/trading.md',
    filename: 'trading.md',
    title: 'Trading',
    isA: 'Topic',
    aliases: ['Algorithmic Trading'],
    belongsTo: [],
    relatedTo: [],
    status: null,
    owner: null,
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 180,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/person/alice.md',
    filename: 'alice.md',
    title: 'Alice',
    isA: 'Person',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    owner: null,
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 100,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
  {
    path: '/vault/event/kickoff.md',
    filename: 'kickoff.md',
    title: 'Kickoff Meeting',
    isA: 'Event',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    owner: null,
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: null,
    fileSize: 200,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
  },
]

const defaultSelection: SidebarSelection = { kind: 'filter', filter: 'all' }

describe('Sidebar', () => {
  afterEach(() => {
    setUserAgent(originalUserAgent)
    setPlatform(originalPlatform)
  })

  it('renders the notebook pages lane in the top nav', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} />)
    expect(screen.getByText('Pages')).toBeInTheDocument()
    expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
  })

  it('renders Grimoire branding in the sidebar title bar', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} />)
    expect(screen.getByTestId('sidebar-title-bar')).toHaveStyle({ paddingLeft: '12px' })
    expect(screen.getByTestId('sidebar-brand')).toHaveClass('justify-start')
    const wordmark = screen.getByTestId('sidebar-brand-wordmark')
    expect(wordmark).toHaveAccessibleName('Grimoire')
    expect(wordmark).toHaveClass('sidebar-brand-wordmark')
    expect(wordmark).toHaveTextContent('Grimoire')
    expect(wordmark.querySelector('svg')).toBeNull()
    expect(screen.getByTestId('sidebar-brand-icon')).toHaveAccessibleName('Grimoire notebook mark')
    expect(screen.queryByAltText('Grimoire icon')).not.toBeInTheDocument()
    expect(screen.getByText('Living notebook')).toBeInTheDocument()
    expect(screen.getByText('Living notebook')).toHaveStyle({ textAlign: 'left' })
    expect(screen.queryByTestId('sidebar-artwork')).not.toBeInTheDocument()
  })

  it('opens notebook search from the left sidebar', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    setPlatform('MacIntel')

    const onOpenSearch = vi.fn()
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} onOpenSearch={onOpenSearch} />)

    const searchInput = screen.getByRole('searchbox', {
      name: 'Search notebook',
    })

    expect(screen.getByTestId('sidebar-search-launcher')).toBeInTheDocument()
    expect(searchInput).toHaveAttribute('placeholder', 'Search')
    expect(searchInput).toHaveAttribute(
      'title',
      'Search notebook',
    )
    expect(searchInput).not.toHaveDisplayValue('Cmd F')

    fireEvent.click(screen.getByTestId('sidebar-search-input'))
    expect(onOpenSearch).toHaveBeenCalledOnce()
  })

  it('renders section group headers only for types present in entries', () => {
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
    expect(screen.getByText('Making')).toBeInTheDocument()
    expect(screen.getByText('Trials')).toBeInTheDocument()
    expect(screen.getByText('Care')).toBeInTheDocument()
    expect(screen.getByText('Ways')).toBeInTheDocument()
    expect(screen.getByText('People')).toBeInTheDocument()
    expect(screen.getByText('Moments')).toBeInTheDocument()
    expect(screen.getByText('Ideas')).toBeInTheDocument()
    // No entries with isA: 'Type' in mockEntries -> Kinds place absent
    expect(screen.queryByText('Kinds')).not.toBeInTheDocument()
  })

  it('does not show inline entity names — sections are flat rows', () => {
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
    // Individual entries should NOT appear inline in the sidebar
    expect(screen.queryByText('Build Grimoire App')).not.toBeInTheDocument()
    expect(screen.queryByText('Grow Newsletter')).not.toBeInTheDocument()
  })

  it('shows note count chip only on the active type section', () => {
    render(<Sidebar entries={mockEntries} selection={{ kind: 'sectionGroup', type: 'Project' }} onSelect={() => {}} />)
    const projectsHeader = screen.getByText('Making').closest('[class*="group/section"]')!
    expect(projectsHeader.textContent).toContain('1')

    const peopleHeader = screen.getByText('People').closest('[class*="group/section"]')!
    expect(peopleHeader.textContent).toBe('People')
  })

  it('calls onSelect when clicking a section header', () => {
    const onSelect = vi.fn()
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Making'))
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'sectionGroup',
      type: 'Project',
    })
  })

  it('selects on every click — no expand/collapse toggle', () => {
    const onSelect = vi.fn()
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('Making'))
    fireEvent.click(screen.getByText('Making'))
    expect(onSelect).toHaveBeenCalledTimes(2)
  })

  it('calls onSelect with sectionGroup for People', () => {
    const onSelect = vi.fn()
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={onSelect} />)
    fireEvent.click(screen.getByText('People'))
    expect(onSelect).toHaveBeenCalledWith({
      kind: 'sectionGroup',
      type: 'Person',
    })
  })

  it('renders Ideas section header', () => {
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
    expect(screen.getByText('Ideas')).toBeInTheDocument()
    // Topic entries are NOT shown inline
    expect(screen.queryByText('Software Development')).not.toBeInTheDocument()
  })

  it('does not render + buttons on type sections', () => {
    render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} onCreateType={() => {}} />)
    expect(screen.queryByTitle('New Project')).not.toBeInTheDocument()
  })

  it('does not render Changes or Pulse in sidebar', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} />)
    expect(screen.queryByText('Changes')).not.toBeInTheDocument()
    expect(screen.queryByText('Pulse')).not.toBeInTheDocument()
    expect(screen.queryByText('Commit & Push')).not.toBeInTheDocument()
  })

  it('keeps advanced machinery sections out of the first sidebar by default', () => {
    const advancedEntries = ['Config', 'Agents', 'Consoles', 'Type'].map((type) => ({
      ...mockEntries[0],
      path: `/vault/${type.toLowerCase()}.md`,
      filename: `${type.toLowerCase()}.md`,
      title: type,
      isA: type,
    }))

    render(<Sidebar entries={[...mockEntries, ...advancedEntries]} selection={defaultSelection} onSelect={() => {}} />)

    expect(screen.queryByText('Config')).not.toBeInTheDocument()
    expect(screen.queryByText('Agents')).not.toBeInTheDocument()
    expect(screen.queryByText('Consoles')).not.toBeInTheDocument()
    expect(screen.queryByText('Kinds')).not.toBeInTheDocument()
    expect(screen.getByText('Making')).toBeInTheDocument()
  })

  describe('dynamic custom type sections', () => {
    const entriesWithCustomTypes: VaultEntry[] = [
      ...mockEntries,
      {
        path: '/vault/recipe.md',
        filename: 'recipe.md',
        title: 'Recipe',
        isA: 'Type',
        aliases: [],
        belongsTo: [],
        relatedTo: [],
        status: null,
        owner: null,
        cadence: null,
        archived: false,
        modifiedAt: 1700000000,
        createdAt: null,
        fileSize: 200,
        snippet: '',
        wordCount: 0,
        relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
      },
      {
        path: '/vault/book.md',
        filename: 'book.md',
        title: 'Book',
        isA: 'Type',
        aliases: [],
        belongsTo: [],
        relatedTo: [],
        status: null,
        owner: null,
        cadence: null,
        archived: false,
        modifiedAt: 1700000000,
        createdAt: null,
        fileSize: 200,
        snippet: '',
        wordCount: 0,
        relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
      },
      {
        path: '/vault/recipe/pasta.md',
        filename: 'pasta.md',
        title: 'Pasta Carbonara',
        isA: 'Recipe',
        aliases: [],
        belongsTo: [],
        relatedTo: [],
        status: null,
        owner: null,
        cadence: null,
        archived: false,
        modifiedAt: 1700000000,
        createdAt: null,
        fileSize: 300,
        snippet: '',
        wordCount: 0,
        relationships: {},
        icon: null,
        color: null,
        order: null,
        template: null, sort: null,
        outgoingLinks: [],
        properties: {},
      },
      {
        path: '/vault/book/ddia.md',
        filename: 'ddia.md',
        title: 'Designing Data-Intensive Applications',
        isA: 'Book',
        aliases: [],
        belongsTo: [],
        relatedTo: [],
        status: null,
        owner: null,
        cadence: null,
        archived: false,
        modifiedAt: 1700000000,
        createdAt: null,
        fileSize: 400,
        snippet: '',
        wordCount: 0,
        relationships: {},
        icon: null,
        color: null,
        order: null,
        template: null, sort: null,
        outgoingLinks: [],
        properties: {},
      },
    ]

    it('renders custom type sections derived from actual entries', () => {
      render(<Sidebar entries={entriesWithCustomTypes} selection={defaultSelection} onSelect={() => {}} onCreateType={() => {}} />)
      expect(screen.getByText('Books')).toBeInTheDocument()
      expect(screen.getByText('Recipes')).toBeInTheDocument()
    })

    it('does not show inline instances — sections are flat rows', () => {
      render(<Sidebar entries={entriesWithCustomTypes} selection={defaultSelection} onSelect={() => {}} onCreateType={() => {}} />)
      expect(screen.queryByText('Pasta Carbonara')).not.toBeInTheDocument()
    })

    it('shows section for type with zero active entries when type definition exists', () => {
      // Only Type definitions exist for Book, no actual Book instances
      // New behavior: types are shown in sidebar as long as the Type definition exists (not archived)
      const entriesNoBookInstance = entriesWithCustomTypes.filter((e) => !(e.isA === 'Book' && e.title !== 'Book'))
      render(<Sidebar entries={entriesNoBookInstance} selection={defaultSelection} onSelect={() => {}} />)
      // Books should still appear because the Book type definition exists
      expect(screen.getByText('Books')).toBeInTheDocument()
      // Recipes still has an instance (Pasta Carbonara)
      expect(screen.getByText('Recipes')).toBeInTheDocument()
    })

    it('shows no sections when entries list is empty', () => {
      render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.queryByText('Making')).not.toBeInTheDocument()
      expect(screen.queryByText('People')).not.toBeInTheDocument()
      expect(screen.queryByText('Moments')).not.toBeInTheDocument()
    })

    it('does not show built-in types as custom sections', () => {
      const projectTypeEntry: VaultEntry = {
        path: '/vault/project.md',
        filename: 'project.md',
        title: 'Project',
        isA: 'Type',
        aliases: [],
        belongsTo: [],
        relatedTo: [],
        status: null,
        owner: null,
        cadence: null,
        archived: false,
        modifiedAt: 1700000000,
        createdAt: null,
        fileSize: 200,
        snippet: '',
        wordCount: 0,
        relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null, sort: null,
    outgoingLinks: [],
    properties: {},
      }
      render(<Sidebar entries={[...mockEntries, projectTypeEntry]} selection={defaultSelection} onSelect={() => {}} />)
      // "Making" should appear once (the built-in Project place), not twice
      const projectLabels = screen.getAllByText('Making')
      expect(projectLabels.length).toBe(1)
    })

    it('uses sidebarLabel from Type entry instead of auto-pluralization', () => {
      const entriesWithLabel: VaultEntry[] = [
        ...mockEntries,
        {
          path: '/vault/news.md', filename: 'news.md', title: 'News', isA: 'Type',
          aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
          archived: false, modifiedAt: 1700000000, createdAt: null,
          fileSize: 200, snippet: '', wordCount: 0, relationships: {},
          icon: null, color: null, order: null, sidebarLabel: 'News', outgoingLinks: [],
          properties: {},
        },
        {
          path: '/vault/news/breaking.md', filename: 'breaking.md', title: 'Breaking Story', isA: 'News',
          aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
          archived: false, modifiedAt: 1700000000, createdAt: null,
          fileSize: 300, snippet: '', wordCount: 0, relationships: {},
          icon: null, color: null, order: null, sidebarLabel: null, outgoingLinks: [],
          properties: {},
        },
      ]
      render(<Sidebar entries={entriesWithLabel} selection={defaultSelection} onSelect={() => {}} />)
      // Should show "News" (custom label), not "Newses" (auto-pluralized)
      expect(screen.getByText('News')).toBeInTheDocument()
      expect(screen.queryByText('Newses')).not.toBeInTheDocument()
    })

    it('uses sidebarLabel to override built-in type label', () => {
      const entriesWithBuiltInOverride: VaultEntry[] = [
        ...mockEntries,
        {
          path: '/vault/person.md', filename: 'person.md', title: 'Person', isA: 'Type',
          aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
          archived: false, modifiedAt: 1700000000, createdAt: null,
          fileSize: 200, snippet: '', wordCount: 0, relationships: {},
          icon: null, color: null, order: null, sidebarLabel: 'Contacts', outgoingLinks: [],
          properties: {},
        },
      ]
      render(<Sidebar entries={entriesWithBuiltInOverride} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByText('Contacts')).toBeInTheDocument()
      expect(screen.queryByText('People')).not.toBeInTheDocument()
    })

    it('falls back to auto-pluralization when sidebarLabel is null', () => {
      render(<Sidebar entries={entriesWithCustomTypes} selection={defaultSelection} onSelect={() => {}} />)
      // Recipe has no sidebarLabel → should auto-pluralize to "Recipes"
      expect(screen.getByText('Recipes')).toBeInTheDocument()
    })
  })

  describe('type visibility via visible property', () => {
    const makeSidebarEntry = (overrides: {
      path: string
      filename: string
      title: string
      isA: string
      visible?: boolean | null
    }): VaultEntry => ({
      path: overrides.path,
      filename: overrides.filename,
      title: overrides.title,
      isA: overrides.isA,
      aliases: [],
      belongsTo: [],
      relatedTo: [],
      status: null,
      owner: null,
      cadence: null,
      archived: false,
      modifiedAt: 1700000000,
      createdAt: null,
      fileSize: 200,
      snippet: '',
      wordCount: 0,
      relationships: {},
      icon: null,
      color: null,
      order: null,
      sidebarLabel: null,
      template: null,
      sort: null,
      view: null,
      visible: overrides.visible ?? null,
      outgoingLinks: [],
      properties: {},
    })

    const makeTypeEntry = (title: string, visible: boolean | null): VaultEntry => makeSidebarEntry({
      path: `/vault/${title.toLowerCase()}.md`,
      filename: `${title.toLowerCase()}.md`,
      title,
      isA: 'Type',
      visible,
    })

    it('hides a section when its Type entry has visible: false', () => {
      const entries: VaultEntry[] = [
        ...mockEntries,
        makeTypeEntry('Person', false),
      ]
      render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.queryByText('People')).not.toBeInTheDocument()
      // Other sections should still be visible
      expect(screen.getByText('Making')).toBeInTheDocument()
    })

    it('shows a section when its Type entry has visible: true', () => {
      const entries: VaultEntry[] = [
        ...mockEntries,
        makeTypeEntry('Person', true),
      ]
      render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('shows a section when its Type entry has visible: null (default)', () => {
      const entries: VaultEntry[] = [
        ...mockEntries,
        makeTypeEntry('Person', null),
      ]
      render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('shows a section when there is no Type entry at all (default visible)', () => {
      // mockEntries has Person instances but no Type entry for Person
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByText('People')).toBeInTheDocument()
    })

    it('hides multiple sections when their Type entries have visible: false', () => {
      const entries: VaultEntry[] = [
        ...mockEntries,
        makeTypeEntry('Person', false),
        makeTypeEntry('Event', false),
      ]
      render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.queryByText('People')).not.toBeInTheDocument()
      expect(screen.queryByText('Moments')).not.toBeInTheDocument()
      expect(screen.getByText('Making')).toBeInTheDocument()
      expect(screen.getByText('Ideas')).toBeInTheDocument()
    })

    it('does not affect Pages or other sidebar filters when sections are hidden', () => {
      const entries: VaultEntry[] = [
        ...mockEntries,
        makeTypeEntry('Project', false),
        makeTypeEntry('Person', false),
      ]
      render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByText('Pages')).toBeInTheDocument()
      expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    })

    it('renders a "Customize places" button', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByTitle('Customize places')).toBeInTheDocument()
    })

    it('opens popover with toggle for each section when clicking customize button', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      fireEvent.click(screen.getByTitle('Customize places'))
      expect(screen.getByText('Show places')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle Making')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle People')).toBeInTheDocument()
      expect(screen.getByLabelText('Toggle Ideas')).toBeInTheDocument()
    })

    it('updates the sidebar type picker when Journal becomes a real type while the app stays open', () => {
      const journalEntries: VaultEntry[] = [
        ...mockEntries,
        makeSidebarEntry({
          path: '/vault/april-21.md',
          filename: 'april-21.md',
          title: 'April 21',
          isA: 'journal',
        }),
      ]
      const { rerender } = render(<Sidebar entries={journalEntries} selection={defaultSelection} onSelect={() => {}} />)

      fireEvent.click(screen.getByTitle('Customize places'))
      expect(screen.queryByLabelText('Toggle Journals')).not.toBeInTheDocument()

      rerender(
        <Sidebar
          entries={[...journalEntries, makeTypeEntry('Journal', null)]}
          selection={defaultSelection}
          onSelect={() => {}}
        />,
      )
      expect(screen.getByLabelText('Toggle Journals')).toBeInTheDocument()

      rerender(<Sidebar entries={journalEntries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.queryByLabelText('Toggle Journals')).not.toBeInTheDocument()
    })

    it('preserves custom section colors in the customize popover', () => {
      const entries: VaultEntry[] = [
        ...mockEntries,
        {
          path: '/vault/project-type.md',
          filename: 'project-type.md',
          title: 'Project',
          isA: 'Type',
          aliases: [],
          belongsTo: [],
          relatedTo: [],
          status: null,
          owner: null,
          cadence: null,
          archived: false,
          modifiedAt: 1700000000,
          createdAt: null,
          fileSize: 200,
          snippet: '',
          wordCount: 0,
          relationships: {},
          icon: null,
          color: 'green',
          order: null,
          sidebarLabel: null,
          template: null, sort: null,
          outgoingLinks: [],
          properties: {},
        },
        {
          path: '/vault/recipe.md',
          filename: 'recipe.md',
          title: 'Recipe',
          isA: 'Type',
          aliases: [],
          belongsTo: [],
          relatedTo: [],
          status: null,
          owner: null,
          cadence: null,
          archived: false,
          modifiedAt: 1700000000,
          createdAt: null,
          fileSize: 200,
          snippet: '',
          wordCount: 0,
          relationships: {},
          icon: null,
          color: 'orange',
          order: null,
          sidebarLabel: null,
          template: null, sort: null,
          outgoingLinks: [],
          properties: {},
        },
        {
          path: '/vault/recipe/pasta.md',
          filename: 'pasta.md',
          title: 'Pasta Carbonara',
          isA: 'Recipe',
          aliases: [],
          belongsTo: [],
          relatedTo: [],
          status: null,
          owner: null,
          cadence: null,
          archived: false,
          modifiedAt: 1700000000,
          createdAt: null,
          fileSize: 200,
          snippet: '',
          wordCount: 0,
          relationships: {},
          icon: null,
          color: null,
          order: null,
          sidebarLabel: null,
          template: null, sort: null,
          outgoingLinks: [],
          properties: {},
        },
      ]

      render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)
      fireEvent.click(screen.getByTitle('Customize places'))

      expect(screen.getByLabelText('Toggle Making').querySelector('svg')).toHaveStyle({ color: 'var(--accent-green)' })
      expect(screen.getByLabelText('Toggle Recipes').querySelector('svg')).toHaveStyle({ color: 'var(--accent-orange)' })
    })

    it('calls onToggleTypeVisibility when toggling a section in the popover', () => {
      const onToggleTypeVisibility = vi.fn()
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} onToggleTypeVisibility={onToggleTypeVisibility} />)
      fireEvent.click(screen.getByTitle('Customize places'))
      fireEvent.click(screen.getByLabelText('Toggle People'))
      expect(onToggleTypeVisibility).toHaveBeenCalledWith('Person')
    })

    it('closes popover when clicking outside', () => {
      render(
        <div>
          <div data-testid="outside">outside</div>
          <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />
        </div>
      )
      fireEvent.click(screen.getByTitle('Customize places'))
      expect(screen.getByText('Show places')).toBeInTheDocument()

      fireEvent.mouseDown(screen.getByTestId('outside'))
      expect(screen.queryByText('Show places')).not.toBeInTheDocument()
    })
  })

  describe('section ordering by type order property', () => {
    const entriesWithOrder: VaultEntry[] = [
      ...mockEntries,
      // Type entries with order values — reversed from default
      {
        path: '/vault/project.md', filename: 'project.md', title: 'Project', isA: 'Type',
        aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
        archived: false, modifiedAt: 1700000000, createdAt: null, fileSize: 200, snippet: '',
        wordCount: 0,
        relationships: {}, icon: null, color: null, order: 5, sidebarLabel: null, outgoingLinks: [],
        properties: {},
      },
      {
        path: '/vault/topic.md', filename: 'topic.md', title: 'Topic', isA: 'Type',
        aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
        archived: false, modifiedAt: 1700000000, createdAt: null, fileSize: 200, snippet: '',
        wordCount: 0,
        relationships: {}, icon: null, color: null, order: 0, sidebarLabel: null, outgoingLinks: [],
        properties: {},
      },
      {
        path: '/vault/person.md', filename: 'person.md', title: 'Person', isA: 'Type',
        aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
        archived: false, modifiedAt: 1700000000, createdAt: null, fileSize: 200, snippet: '',
        wordCount: 0,
        relationships: {}, icon: null, color: null, order: 1, sidebarLabel: null, outgoingLinks: [],
        properties: {},
      },
    ]

    it('sorts sections by order from Type entries', () => {
      render(<Sidebar entries={entriesWithOrder} selection={defaultSelection} onSelect={() => {}} />)
      // Get all section header labels
      const headers = screen.getAllByText(/^(Ideas|People|Making|Trials|Care|Ways|Moments|Kinds)$/)
      const labels = headers.map((el) => el.textContent)

      // Ideas (order: 0) and People (order: 1) should come before Making (order: 5)
      const topicsIdx = labels.indexOf('Ideas')
      const peopleIdx = labels.indexOf('People')
      const projectsIdx = labels.indexOf('Making')

      expect(topicsIdx).toBeLessThan(projectsIdx)
      expect(peopleIdx).toBeLessThan(projectsIdx)
      expect(topicsIdx).toBeLessThan(peopleIdx)
    })

    it('does not render drag handle icons on section headers', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      const dragHandles = screen.queryAllByLabelText(/^Drag to reorder/)
      expect(dragHandles.length).toBe(0)
    })
  })

  describe('rename place via context menu', () => {
    it('shows Rename place option in context menu on right-click', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      const projectHeader = screen.getByText('Making').closest('div')!
      fireEvent.contextMenu(projectHeader)
      expect(screen.getByTestId('sidebar-context-menu')).toHaveAttribute('role', 'menu')
      expect(screen.getByText('Rename place…')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Rename place…' })).toBeInTheDocument()
    })

    it('shows Customize mark option in context menu on right-click', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      const projectHeader = screen.getByText('Making').closest('div')!
      fireEvent.contextMenu(projectHeader)
      expect(screen.getByTestId('sidebar-context-menu')).toBeInTheDocument()
      expect(screen.getByText('Customize mark & color…')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'Customize mark & color…' })).toBeInTheDocument()
    })

    it('shows inline input when Rename place is clicked', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      const projectHeader = screen.getByText('Making').closest('div')!
      fireEvent.contextMenu(projectHeader)
      fireEvent.click(screen.getByText('Rename place…'))
      expect(screen.getByRole('textbox', { name: 'Place name' })).toBeInTheDocument()
    })

    it('inline input is pre-filled with current label', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      const projectHeader = screen.getByText('Making').closest('div')!
      fireEvent.contextMenu(projectHeader)
      fireEvent.click(screen.getByText('Rename place…'))
      const input = screen.getByRole('textbox', { name: 'Place name' }) as HTMLInputElement
      expect(input.value).toBe('Making')
    })

    it('calls onRenameSection with new name on Enter', () => {
      const onRenameSection = vi.fn()
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} onRenameSection={onRenameSection} />)
      const projectHeader = screen.getByText('Making').closest('div')!
      fireEvent.contextMenu(projectHeader)
      fireEvent.click(screen.getByText('Rename place…'))
      const input = screen.getByRole('textbox', { name: 'Place name' })
      fireEvent.change(input, { target: { value: 'My Projects' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onRenameSection).toHaveBeenCalledWith('Project', 'My Projects')
    })

    it('cancels rename on Escape and hides input', () => {
      const onRenameSection = vi.fn()
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} onRenameSection={onRenameSection} />)
      const projectHeader = screen.getByText('Making').closest('div')!
      fireEvent.contextMenu(projectHeader)
      fireEvent.click(screen.getByText('Rename place…'))
      const input = screen.getByRole('textbox', { name: 'Place name' })
      fireEvent.keyDown(input, { key: 'Escape' })
      expect(onRenameSection).not.toHaveBeenCalled()
      expect(screen.queryByRole('textbox', { name: 'Place name' })).not.toBeInTheDocument()
    })
  })

  describe('Note type in Places', () => {
    const noteEntries: VaultEntry[] = [
      ...mockEntries,
      {
        path: '/vault/note.md', filename: 'note.md', title: 'Note', isA: 'Type',
        aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null, cadence: null,
        archived: false, modifiedAt: 1700000000, createdAt: null,
        fileSize: 200, snippet: '', wordCount: 0, relationships: {},
        icon: null, color: null, order: null, sidebarLabel: null, template: null, sort: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/explicit-note.md', filename: 'explicit-note.md', title: 'Explicit Note',
        isA: 'Note', aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
        cadence: null, archived: false, modifiedAt: 1700000000,
        createdAt: null, fileSize: 300, snippet: '', wordCount: 0, relationships: {},
        icon: null, color: null, order: null, sidebarLabel: null, template: null, sort: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/untyped-note.md', filename: 'untyped-note.md', title: 'Untyped Note',
        isA: null, aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
        cadence: null, archived: false, modifiedAt: 1700000000,
        createdAt: null, fileSize: 150, snippet: '', wordCount: 0, relationships: {},
        icon: null, color: null, order: null, sidebarLabel: null, template: null, sort: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/binary-note.pdf', filename: 'binary-note.pdf', title: 'Binary Note',
        isA: 'Note', aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
        cadence: null, archived: false, modifiedAt: 1700000000,
        createdAt: null, fileSize: 150, snippet: '', wordCount: 0, relationships: {},
        icon: null, color: null, order: null, sidebarLabel: null, template: null, sort: null,
        outgoingLinks: [], properties: {}, fileKind: 'binary',
      },
    ]

    const visibleNoteEntries = noteEntries.map((entry) =>
      entry.title === 'Note' ? { ...entry, visible: true } : entry,
    )

    function queryLoosePagesPlace(): HTMLElement | null {
      return screen.queryAllByText('Loose pages')
        .map((label) => label.closest('[class*="group/section"]') as HTMLElement | null)
        .find(Boolean) ?? null
    }

    function getLoosePagesPlace(): HTMLElement {
      const section = queryLoosePagesPlace()
      if (!section) throw new Error('Expected Loose pages place')
      return section
    }

    it('hides Loose pages by default because Pages already owns generic notes', () => {
      render(<Sidebar entries={noteEntries} selection={defaultSelection} onSelect={() => {}} />)
      expect(queryLoosePagesPlace()).not.toBeInTheDocument()
    })

    it('shows Loose pages when the Note type is explicitly visible', () => {
      render(<Sidebar entries={visibleNoteEntries} selection={defaultSelection} onSelect={() => {}} />)
      expect(getLoosePagesPlace()).toBeInTheDocument()
    })

    it('counts only explicit Note entries in the Loose pages chip', () => {
      render(<Sidebar entries={visibleNoteEntries} selection={{ kind: 'sectionGroup', type: 'Note' }} onSelect={() => {}} />)
      const notesHeader = getLoosePagesPlace()
      expect(notesHeader.textContent).toContain('1')
    })

    it('ignores non-markdown Note entries in the Loose pages chip', () => {
      render(<Sidebar entries={visibleNoteEntries} selection={{ kind: 'sectionGroup', type: 'Note' }} onSelect={() => {}} />)
      const notesHeader = getLoosePagesPlace()
      expect(notesHeader.textContent).toContain('1')
      expect(notesHeader.textContent).not.toContain('2')
    })

    it('keeps the Loose pages count aligned when an entry changes to or from Note', () => {
      const activeNotesSelection: SidebarSelection = { kind: 'sectionGroup', type: 'Note' }
      const { rerender } = render(<Sidebar entries={visibleNoteEntries} selection={activeNotesSelection} onSelect={() => {}} />)
      let notesHeader = getLoosePagesPlace()
      expect(notesHeader.textContent).toContain('1')

      const withoutExplicitNote = visibleNoteEntries.map((entry) =>
        entry.path === '/vault/explicit-note.md' ? { ...entry, isA: null } : entry,
      )
      rerender(<Sidebar entries={withoutExplicitNote} selection={activeNotesSelection} onSelect={() => {}} />)
      notesHeader = getLoosePagesPlace()
      expect(notesHeader.textContent).toBe('Loose pages')

      const withNewExplicitNote = visibleNoteEntries.map((entry) =>
        entry.path === '/vault/untyped-note.md' ? { ...entry, isA: 'Note' } : entry,
      )
      rerender(<Sidebar entries={withNewExplicitNote} selection={activeNotesSelection} onSelect={() => {}} />)
      notesHeader = getLoosePagesPlace()
      expect(notesHeader.textContent).toContain('2')
    })

    it('does not show Loose pages for untyped entries without explicit Note entries', () => {
      const untypedOnly: VaultEntry[] = [
        {
          path: '/vault/plain.md', filename: 'plain.md', title: 'Plain Note',
          isA: null, aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
          cadence: null, archived: false, modifiedAt: 1700000000,
          createdAt: null, fileSize: 100, snippet: '', wordCount: 0, relationships: {},
          icon: null, color: null, order: null, sidebarLabel: null, template: null, sort: null,
          outgoingLinks: [], properties: {},
        },
      ]
      render(<Sidebar entries={untypedOnly} selection={defaultSelection} onSelect={() => {}} />)
      expect(queryLoosePagesPlace()).not.toBeInTheDocument()
    })
  })

  it('renders exactly one section for a hyphenated custom type like Monday Ideas', () => {
    const entriesWithMondayIdeas: VaultEntry[] = [
      ...mockEntries,
      {
        path: '/vault/monday-ideas/standup-bingo.md',
        filename: 'standup-bingo.md',
        title: 'Standup Bingo',
        isA: 'Monday Ideas',
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: false,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 310, snippet: '', wordCount: 120,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/monday-ideas/theme-days.md',
        filename: 'theme-days.md',
        title: 'Theme Days',
        isA: 'Monday Ideas',
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: false,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 280, snippet: '', wordCount: 95,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        outgoingLinks: [], properties: {},
      },
    ]
    render(<Sidebar entries={entriesWithMondayIdeas} selection={defaultSelection} onSelect={() => {}} />)
    // "Monday Ideas" pluralized → "Monday Ideases" (the pluralizeType function)
    const mondaySections = screen.getAllByText(/Monday Ideas/i)
    expect(mondaySections).toHaveLength(1)
  })

  it('renders Notebook before Inbox in the top nav', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} inboxCount={5} />)
    const topNav = screen.getByTestId('sidebar-top-nav')
    const items = topNav.children
    expect(items[0].textContent).toContain('Notebook')
    expect(items[1].textContent).toContain('Inbox')
    expect(items[2].textContent).toContain('Pages')
    expect(items[3].textContent).toContain('Journal')
    expect(items[4].textContent).toContain('Dreams')
    expect(items[5].textContent).toContain('Archive')
  })

  it('keeps Inbox free of a top-nav count badge', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} inboxCount={12} />)
    expect(screen.getByRole('button', { name: /inbox/i }).textContent).toBe('Inbox')
    expect(screen.queryByText('12')).not.toBeInTheDocument()
  })

  it('calls onSelect with inbox filter when clicking Inbox', () => {
    const onSelect = vi.fn()
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={onSelect} inboxCount={3} />)
    fireEvent.click(screen.getByText('Inbox'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'filter', filter: 'inbox' })
  })

  it('hides Inbox when explicit organization is disabled', () => {
    render(<Sidebar entries={[]} selection={defaultSelection} onSelect={() => {}} showInbox={false} inboxCount={3} />)
    expect(screen.queryByText('Inbox')).not.toBeInTheDocument()
    const topNav = screen.getByTestId('sidebar-top-nav')
    expect(topNav.children[0].textContent).toContain('Notebook')
    expect(topNav.children[1].textContent).toContain('Pages')
    expect(topNav.children[2].textContent).toContain('Journal')
  })

  it('excludes attachments-folder markdown from top-nav note totals', () => {
    const entries: VaultEntry[] = [
      {
        path: '/vault/note/real-note.md',
        filename: 'real-note.md',
        title: 'Real Note',
        isA: 'Note',
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: false,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 310, snippet: '', wordCount: 120,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/attachments/reference.md',
        filename: 'reference.md',
        title: 'Attachment Markdown',
        isA: 'Note',
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: false,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 220, snippet: '', wordCount: 50,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/attachments/nested/archive.md',
        filename: 'archive.md',
        title: 'Attachment Archive',
        isA: 'Note',
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: true,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 180, snippet: '', wordCount: 25,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/archive/real-archive.md',
        filename: 'real-archive.md',
        title: 'Real Archive',
        isA: 'Note',
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: true,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 280, snippet: '', wordCount: 90,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        outgoingLinks: [], properties: {},
      },
      {
        path: '/vault/attachments/image.png',
        filename: 'image.png',
        title: 'image.png',
        isA: null,
        aliases: [], belongsTo: [], relatedTo: [],
        status: null, owner: null, cadence: null,
        archived: false,
        modifiedAt: 1700000000, createdAt: null,
        fileSize: 1024, snippet: '', wordCount: 0,
        relationships: {}, icon: null, color: null, order: null,
        sidebarLabel: null, template: null, sort: null, view: null,
        fileKind: 'binary',
        outgoingLinks: [], properties: {},
      },
    ]

    render(<Sidebar entries={entries} selection={defaultSelection} onSelect={() => {}} />)

    const topNav = screen.getByTestId('sidebar-top-nav')
    expect(within(topNav).getByRole('button', { name: /pages/i }).textContent).toBe('Pages')
    expect(within(topNav).queryByRole('button', { name: /^notes/i })).not.toBeInTheDocument()
    expect(within(topNav).getByRole('button', { name: /archive/i }).textContent).toBe('Archive')
  })

  it('adds dedicated local lanes for journals and dreams without duplicating Notes', () => {
    const onSelect = vi.fn()
    const entries: VaultEntry[] = [
      { ...mockEntries[0], path: '/vault/notes/plain.md', title: 'Plain', isA: 'Note' },
      { ...mockEntries[0], path: '/vault/journal/today.md', title: 'Today', isA: 'journal' },
      { ...mockEntries[0], path: '/vault/dreams/river.md', title: 'River', isA: 'Dream' },
    ]

    render(<Sidebar entries={entries} selection={{ kind: 'sectionGroup', type: 'Journal' }} onSelect={onSelect} />)

    const topNav = screen.getByTestId('sidebar-top-nav')
    expect(within(topNav).queryByRole('button', { name: /^notes/i })).not.toBeInTheDocument()
    expect(within(topNav).getByRole('button', { name: /journal/i }).textContent).toBe('Journal')
    expect(within(topNav).getByRole('button', { name: /dreams/i }).textContent).toBe('Dreams')
    expect(within(topNav).getByRole('button', { name: /journal/i })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(within(topNav).getByRole('button', { name: /dreams/i }))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'sectionGroup', type: 'Dream' })
  })

  it('does not show inline entries — no child items in type sections', () => {
    const entriesWithEmoji: VaultEntry[] = [
      {
        path: '/vault/project/build-app.md', filename: 'build-app.md', title: 'Build App',
        isA: 'Project', aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
        cadence: null, archived: false, modifiedAt: 1700000000,
        createdAt: null, fileSize: 300, snippet: '', wordCount: 0, relationships: {},
        icon: '🚀', color: null, order: null, sidebarLabel: null, template: null,
        sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
      },
    ]
    render(<Sidebar entries={entriesWithEmoji} selection={defaultSelection} onSelect={() => {}} />)
    expect(screen.queryByText('Build App')).not.toBeInTheDocument()
  })

  describe('Favorites section', () => {
    const favEntry: VaultEntry = {
      path: '/vault/project/fav.md', filename: 'fav.md', title: 'My Favorite Note',
      isA: 'Project', aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
      cadence: null, archived: false, modifiedAt: 1700000000,
      createdAt: null, fileSize: 100, snippet: '', wordCount: 0, relationships: {},
      icon: null, color: null, order: null, sidebarLabel: null, template: null,
      sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
      favorite: true, favoriteIndex: 0,
    }

    function getFavoriteAndTypeRows(favoriteTitle = 'My Favorite Note') {
      const favoriteLabel = screen.getByText(favoriteTitle)
      const favoriteRow = favoriteLabel.closest('.cursor-pointer')
      if (!screen.queryByText('Making')) {
        fireEvent.click(screen.getByText('Places'))
      }
      const typeLabel = screen.getByText('Making')
      const typeRow = typeLabel.closest('.cursor-pointer')
      expect(favoriteRow).not.toBeNull()
      expect(typeRow).not.toBeNull()

      return {
        favoriteLabel,
        favoriteRow: favoriteRow as HTMLElement,
        typeLabel,
        typeRow: typeRow as HTMLElement,
      }
    }

    function expectFavoriteIconToMatchTypeSizing(favoriteRow: HTMLElement) {
      const favoriteIcon = favoriteRow.querySelector('svg')
      expect(favoriteIcon).not.toBeNull()
      expect(favoriteIcon!.getAttribute('width')).toBe('16')
      expect(favoriteIcon!.getAttribute('height')).toBe('16')
      expect(favoriteIcon!.getAttribute('style')).toContain('var(--accent-red)')
      return favoriteIcon as SVGElement
    }

    function expectFavoriteRowToMatchTypeRow(favoriteTitle = 'My Favorite Note') {
      const { favoriteLabel, favoriteRow, typeLabel, typeRow } = getFavoriteAndTypeRows(favoriteTitle)

      expect(favoriteRow.className).toBe(typeRow.className)
      expect(favoriteRow.style.padding).toBe(typeRow.style.padding)
      expect(favoriteRow.style.gap).toBe(typeRow.style.gap)
      expect(favoriteLabel.className).toContain(typeLabel.className)
      expect(favoriteLabel.className).toContain('truncate')
      return {
        favoriteRow,
        typeRow,
        favoriteIcon: expectFavoriteIconToMatchTypeSizing(favoriteRow),
      }
    }

    it('shows Favorites section when there are favorites', () => {
      render(<Sidebar entries={[...mockEntries, favEntry]} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.getByText('Favorites')).toBeInTheDocument()
      expect(screen.getByText('My Favorite Note')).toBeInTheDocument()
    })

    it('preserves plain square brackets in favorite titles', () => {
      const bracketedFavorite = { ...favEntry, title: '[26Q2] Grimoire MVP' }

      render(<Sidebar entries={[...mockEntries, bracketedFavorite]} selection={defaultSelection} onSelect={() => {}} />)

      expect(screen.getByText('[26Q2] Grimoire MVP')).toBeInTheDocument()
    })

    it('hides Favorites section when no favorites', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      expect(screen.queryByText('Favorites')).not.toBeInTheDocument()
    })

    it('calls onSelect with favorites filter when clicking a favorite', () => {
      const onSelect = vi.fn()
      render(<Sidebar entries={[...mockEntries, favEntry]} selection={defaultSelection} onSelect={onSelect} />)
      fireEvent.click(screen.getByText('My Favorite Note'))
      expect(onSelect).toHaveBeenCalledWith({ kind: 'filter', filter: 'favorites' })
    })

    it('matches the Places row styling and type color for favorites', () => {
      render(<Sidebar entries={[...mockEntries, favEntry]} selection={defaultSelection} onSelect={() => {}} />)
      expectFavoriteRowToMatchTypeRow()
    })

    it('aligns the favorites header count pill with the shared sidebar count column', () => {
      render(<Sidebar entries={[...mockEntries, favEntry]} selection={defaultSelection} onSelect={() => {}} />)

      const favoritesHeader = screen.getByText('Favorites').closest('div') as HTMLElement
      const countChip = within(favoritesHeader).getByTestId('sidebar-count-chip')

      expect(favoritesHeader).toHaveStyle({ padding: '8px 8px 8px 16px' })
      expect(countChip).toHaveStyle({
        background: 'var(--muted)',
        height: '18px',
        padding: '0 6px',
      })
    })

    it('prefers a favorite note emoji icon over the type icon fallback', () => {
      const emojiFavorite = { ...favEntry, title: 'Emoji Favorite', icon: '🚀' }

      render(<Sidebar entries={[...mockEntries, emojiFavorite]} selection={defaultSelection} onSelect={() => {}} />)

      const emojiRow = screen.getByText('Emoji Favorite').closest('.cursor-pointer')
      expect(within(emojiRow as HTMLElement).getByText('🚀')).toBeInTheDocument()
      expect(emojiRow?.querySelector('svg')).toBeNull()
    })

    it('uses a favorite note phosphor icon and keeps the type color', () => {
      const iconFavorite = { ...favEntry, title: 'Icon Favorite', icon: 'rocket' }

      render(<Sidebar entries={[...mockEntries, iconFavorite]} selection={defaultSelection} onSelect={() => {}} />)

      const { favoriteIcon, typeRow } = expectFavoriteRowToMatchTypeRow('Icon Favorite')
      const typeIcon = typeRow.querySelector('svg')
      expect(typeIcon).not.toBeNull()
      expect(favoriteIcon.innerHTML).not.toBe(typeIcon!.innerHTML)
    })

    it('falls back to a neutral icon color when the favorite type has no defined color', () => {
      const customType: VaultEntry = {
        path: '/vault/types/recipe.md', filename: 'recipe.md', title: 'Recipe',
        isA: 'Type', aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
        cadence: null, archived: false, modifiedAt: 1700000000,
        createdAt: null, fileSize: 120, snippet: '', wordCount: 0, relationships: {},
        icon: 'flask', color: null, order: null, sidebarLabel: null, template: null,
        sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
      }
      const recipeFavorite: VaultEntry = {
        path: '/vault/recipe/sourdough.md', filename: 'sourdough.md', title: 'Sourdough',
        isA: 'Recipe', aliases: [], belongsTo: [], relatedTo: [], status: null, owner: null,
        cadence: null, archived: false, modifiedAt: 1700000000,
        createdAt: null, fileSize: 120, snippet: '', wordCount: 0, relationships: {},
        icon: null, color: null, order: null, sidebarLabel: null, template: null,
        sort: null, view: null, visible: null, outgoingLinks: [], properties: {},
        favorite: true, favoriteIndex: 0,
      }

      render(<Sidebar entries={[...mockEntries, customType, recipeFavorite]} selection={defaultSelection} onSelect={() => {}} />)

      const recipeRow = screen.getByText('Sourdough').closest('.cursor-pointer')
      const recipeIcon = recipeRow?.querySelector('svg')

      expect(recipeIcon?.getAttribute('style')).toContain('var(--muted-foreground)')
      expect(within(recipeRow as HTMLElement).getByText('Sourdough')).toBeInTheDocument()
    })
  })

  describe('group separators', () => {
    it('Places header and its entries share the same border-b container (no separator inside group)', () => {
      render(<Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />)
      const sectionsHeader = screen.getByText('Places')
      if (!screen.queryByText('Making')) {
        fireEvent.click(sectionsHeader)
      }
      const projectsSection = screen.getByText('Making')
      // Walk up from Places header to find the border-b container
      const borderContainer = sectionsHeader.closest('.border-b')
      expect(borderContainer).not.toBeNull()
      // The section entry should be inside the same border-b container
      expect(borderContainer!.contains(projectsSection)).toBe(true)
    })
  })

  describe('view edit button', () => {
    const mockViews = [
      {
        filename: 'active-projects.yml',
        definition: {
          name: 'Active Projects',
          icon: '🚀',
          color: null,
          sort: null,
          filters: { all: [{ field: 'type', op: 'equals' as const, value: 'Project' }] },
        },
      },
    ]

    it('renders edit button for each view item when onEditView is provided', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={mockViews} onEditView={() => {}} onDeleteView={() => {}} />
      )
      expect(screen.getByTitle('Edit lens')).toBeInTheDocument()
    })

    it('does not render edit button when onEditView is not provided', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={mockViews} onDeleteView={() => {}} />
      )
      expect(screen.queryByTitle('Edit lens')).not.toBeInTheDocument()
    })

    it('calls onEditView with correct filename when clicked', () => {
      const onEditView = vi.fn()
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={mockViews} onEditView={onEditView} onDeleteView={() => {}} />
      )
      fireEvent.click(screen.getByTitle('Edit lens'))
      expect(onEditView).toHaveBeenCalledWith('active-projects.yml')
    })

    it('keeps empty saved-view chrome out of the first notebook sidebar', () => {
      const onCreateView = vi.fn()
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={[]} onCreateView={onCreateView} />
      )
      expect(screen.queryByText('Lenses')).not.toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Create lens' }))
      expect(onCreateView).toHaveBeenCalledOnce()
    })
  })

  describe('create type button', () => {
    it('renders + button in Places header when onCreateNewType is provided', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} onCreateNewType={() => {}} />
      )
      expect(screen.getByText('Places')).toBeInTheDocument()
      expect(screen.getByTestId('create-type-btn')).toBeInTheDocument()
    })

    it('does not render + button when onCreateNewType is not provided', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} />
      )
      expect(screen.queryByTestId('create-type-btn')).not.toBeInTheDocument()
    })

    it('calls onCreateNewType when + button is clicked', () => {
      const onCreateNewType = vi.fn()
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} onCreateNewType={onCreateNewType} />
      )
      fireEvent.click(screen.getByTestId('create-type-btn'))
      expect(onCreateNewType).toHaveBeenCalledOnce()
    })
  })

  describe('view note count chips', () => {
    const mockViews = [
      {
        filename: 'active-projects.yml',
        definition: {
          name: 'Active Projects',
          icon: '🚀',
          color: null,
          sort: null,
          filters: { all: [{ field: 'type', op: 'equals' as const, value: 'Project' }] },
        },
      },
      {
        filename: 'all-topics.yml',
        definition: {
          name: 'All Topics',
          icon: null,
          color: null,
          sort: null,
          filters: { all: [{ field: 'type', op: 'equals' as const, value: 'Topic' }] },
        },
      },
    ]

    it('shows note count chip for each view matching the filter results', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={mockViews} />
      )
      // 'Active Projects' filters for type=Project -> mockEntries has 1 Project (build-app.md)
      const projectLabel = screen.getByText('Active Projects')
      const projectNavItem = projectLabel.closest('[class*="cursor-pointer"]')!
      // The count chip is a sibling span inside the NavItem
      const projectCount = within(projectNavItem as HTMLElement).getByTestId('view-count-chip')
      expect(projectCount?.textContent).toBe('1')

      // 'All Topics' filters for type=Topic -> mockEntries has 2 Topics
      const topicLabel = screen.getByText('All Topics')
      const topicNavItem = topicLabel.closest('[class*="cursor-pointer"]')!
      const topicCount = within(topicNavItem as HTMLElement).getByTestId('view-count-chip')
      expect(topicCount?.textContent).toBe('2')
    })

    it('styles view note count chips like the shared sidebar count pills', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={mockViews} />
      )

      const viewLabel = screen.getByText('Active Projects')
      const navItem = viewLabel.closest('[class*="cursor-pointer"]') as HTMLElement
      const countChip = within(navItem).getByTestId('view-count-chip')

      expect(navItem).toHaveStyle({ padding: '6px 8px 6px 16px' })
      expect(countChip).toHaveStyle({
        background: 'var(--muted)',
        height: '20px',
        padding: '0 6px',
      })
      expect(countChip.className).toContain('text-muted-foreground')
    })

    it('keeps top-nav labels count-free while view rows retain their count chips', () => {
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} inboxCount={12} views={mockViews} />
      )

      const topNavItem = screen.getByText('Inbox').closest('[class*="cursor-pointer"]') as HTMLElement
      const viewItem = screen.getByText('Active Projects').closest('[class*="cursor-pointer"]') as HTMLElement
      const viewCount = within(viewItem).getByTestId('view-count-chip')

      expect(topNavItem).toHaveStyle({ padding: '6px 16px' })
      expect(viewItem).toHaveStyle({ padding: '6px 8px 6px 16px' })
      expect(within(topNavItem).queryByTestId('sidebar-count-chip')).not.toBeInTheDocument()
      expect(topNavItem.textContent).toBe('Inbox')
      expect(viewCount).toHaveStyle({
        background: 'var(--muted)',
        height: '20px',
        padding: '0 6px',
      })
    })

    it('renders phosphor view icons without leaking the raw icon name', () => {
      const iconViews = [{
        filename: 'active-projects.yml',
        definition: {
          name: 'Active Projects',
          icon: 'rocket',
          color: null,
          sort: null,
          filters: { all: [{ field: 'type', op: 'equals' as const, value: 'Project' }] },
        },
      }]

      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={iconViews} />
      )

      const navItem = screen.getByText('Active Projects').closest('[class*="cursor-pointer"]') as HTMLElement
      expect(navItem.querySelector('svg')).not.toBeNull()
      expect(screen.queryByText('rocket')).not.toBeInTheDocument()
    })

    it('does not show count chip for views with 0 matching notes', () => {
      const emptyView = [{
        filename: 'empty.yml',
        definition: {
          name: 'Empty View',
          icon: null,
          color: null,
          sort: null,
          filters: { all: [{ field: 'type', op: 'equals' as const, value: 'Nonexistent' }] },
        },
      }]
      render(
        <Sidebar entries={mockEntries} selection={defaultSelection} onSelect={() => {}} views={emptyView} />
      )
      expect(screen.getByText('Empty View')).toBeInTheDocument()
      // No count chip rendered for 0 results (NavItem hides count <= 0)
      const viewContainer = screen.getByText('Empty View').closest('div')
      expect(viewContainer?.querySelector('span:last-child')?.textContent).not.toBe('0')
    })

    it('adds hover and focus classes that hide the view count chip while showing the action buttons', () => {
      render(
        <Sidebar
          entries={mockEntries}
          selection={defaultSelection}
          onSelect={() => {}}
          views={mockViews}
          onEditView={() => {}}
          onDeleteView={() => {}}
        />
      )

      const label = screen.getByText('Active Projects')
      const viewItem = label.closest('.group.relative') as HTMLElement
      const navItem = label.closest('[class*="cursor-pointer"]') as HTMLElement
      const countChip = within(navItem).getByTestId('view-count-chip')
      expect(countChip).toBeTruthy()
      expect(countChip.className).toContain('transition-opacity')
      expect(countChip.className).toContain('group-hover:opacity-0')
      expect(countChip.className).toContain('group-focus-within:opacity-0')

      const actionButton = within(viewItem).getByTitle('Edit lens')
      const actionContainer = actionButton.parentElement as HTMLElement
      expect(actionContainer.className).toContain('pointer-events-none')
      expect(actionContainer.className).toContain('group-hover:pointer-events-auto')
      expect(actionContainer.className).toContain('group-focus-within:pointer-events-auto')
      expect(actionContainer.className).toContain('group-hover:opacity-100')
      expect(actionContainer.className).toContain('group-focus-within:opacity-100')
    })
  })
})

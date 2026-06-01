import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TypeCustomizePopover } from './TypeCustomizePopover'
import { resolveIcon } from '../utils/iconRegistry'
import { ICON_OPTIONS } from '../utils/iconOptions'

describe('resolveIcon', () => {
  it('returns the correct icon component for known name', () => {
    const Icon = resolveIcon('wrench')
    expect(Icon).toBeDefined()
    // wrench should not be the default fallback (file-text)
    const fileTextIcon = resolveIcon('file-text')
    expect(Icon).not.toBe(fileTextIcon)
  })

  it('returns FileText fallback for null', () => {
    const Icon = resolveIcon(null)
    expect(Icon).toBeDefined()
  })

  it('returns FileText fallback for unknown name', () => {
    const Icon = resolveIcon('nonexistent-icon')
    expect(Icon).toBeDefined()
  })

  it('returns Grimoire knowledge icons for custom names', () => {
    expect(resolveIcon('vedas')).toBe(resolveIcon('veda'))
    expect(resolveIcon('shaastras')).toBe(resolveIcon('shastra'))
    expect(resolveIcon('puranas')).toBe(resolveIcon('purana'))
    expect(resolveIcon('rishi')).toBeDefined()
    expect(resolveIcon('second-brain')).toBeDefined()
  })
})

describe('ICON_OPTIONS', () => {
  it('contains 200+ icons', () => {
    expect(ICON_OPTIONS.length).toBeGreaterThanOrEqual(200)
  })

  it('has unique names', () => {
    const names = ICON_OPTIONS.map((o) => o.name)
    expect(new Set(names).size).toBe(names.length)
  })

  it('uses kebab-case names', () => {
    for (const option of ICON_OPTIONS) {
      expect(option.name).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('includes the Grimoire knowledge icon pack', () => {
    const names = ICON_OPTIONS.map((o) => o.name)
    expect(names).toEqual(expect.arrayContaining([
      'vedas',
      'shaastras',
      'puranas',
      'rishi',
      'second-brain',
      'star',
      'brain',
    ]))
  })
})

describe('TypeCustomizePopover', () => {
  const onChangeIcon = vi.fn()
  const onChangeColor = vi.fn()
  const onChangeTemplate = vi.fn()
  const onClose = vi.fn()

  const renderPopover = async (overrides: Partial<Parameters<typeof TypeCustomizePopover>[0]> = {}) => {
    const result = render(
      <TypeCustomizePopover
        currentIcon={null}
        currentColor={null}
        currentTemplate={null}
        onChangeIcon={onChangeIcon}
        onChangeColor={onChangeColor}
        onChangeTemplate={onChangeTemplate}
        onClose={onClose}
        {...overrides}
      />
    )
    await screen.findByTitle('wrench')
    return result
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders color, icon, and template sections', async () => {
    await renderPopover()
    expect(screen.getByText('Color')).toBeInTheDocument()
    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('Template')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
  })

  it('renders search input', async () => {
    await renderPopover()
    expect(screen.getByPlaceholderText('Search icons…')).toBeInTheDocument()
  })

  it('filters icons by search query', async () => {
    await renderPopover()

    const searchInput = screen.getByPlaceholderText('Search icons…')
    fireEvent.change(searchInput, { target: { value: 'book' } })

    // Should show book-related icons
    expect(await screen.findByTitle('book')).toBeInTheDocument()
    expect(await screen.findByTitle('book-open')).toBeInTheDocument()
    // Should not show unrelated icons
    expect(screen.queryByTitle('wrench')).not.toBeInTheDocument()
  })

  it('shows empty state when no icons match search', async () => {
    await renderPopover()

    const searchInput = screen.getByPlaceholderText('Search icons…')
    fireEvent.change(searchInput, { target: { value: 'zzzznonexistent' } })

    expect(await screen.findByText('No icons found')).toBeInTheDocument()
  })

  it('calls onChangeColor when a color is clicked', async () => {
    await renderPopover()

    const colorButtons = screen.getAllByTitle(/red|blue|green|purple|yellow|orange|teal|pink/i)
    fireEvent.click(colorButtons[0])

    expect(onChangeColor).toHaveBeenCalled()
  })

  it('calls onChangeIcon when an icon is clicked', async () => {
    await renderPopover()

    fireEvent.click(await screen.findByTitle('wrench'))
    expect(onChangeIcon).toHaveBeenCalledWith('wrench')
  })

  it('calls onChangeIcon when an image badge is clicked', async () => {
    await renderPopover()

    fireEvent.click(screen.getByRole('button', { name: 'Spelllink badge' }))
    expect(onChangeIcon).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/svg\+xml/))
  })

  it('calls onChangeIcon when an emoji is selected', async () => {
    await renderPopover()

    fireEvent.click(screen.getByRole('button', { name: 'Choose emoji icon' }))
    const emojiSearch = await screen.findByTestId('emoji-picker-search')
    fireEvent.change(emojiSearch, { target: { value: 'fire' } })
    const fireButton = (await screen.findAllByTestId('emoji-option')).find((button) => button.textContent === '🔥')
    expect(fireButton).toBeDefined()
    fireEvent.click(fireButton!)

    expect(onChangeIcon).toHaveBeenCalledWith('🔥')
  })

  it('calls onClose when Done is clicked', async () => {
    await renderPopover()

    fireEvent.click(screen.getByText('Done'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders all color options including teal and pink', async () => {
    await renderPopover()

    expect(screen.getByTitle('Teal')).toBeInTheDocument()
    expect(screen.getByTitle('Pink')).toBeInTheDocument()
  })

  // --- Template tests ---

  it('renders template textarea', async () => {
    await renderPopover()
    expect(screen.getByTestId('template-textarea')).toBeInTheDocument()
  })

  it('shows placeholder when template is empty', async () => {
    await renderPopover()
    expect(screen.getByPlaceholderText('Markdown template for new notes of this type…')).toBeInTheDocument()
  })

  it('displays current template value', async () => {
    await renderPopover({ currentTemplate: '## Objective\n\n## Notes' })
    const textarea = screen.getByTestId('template-textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('## Objective\n\n## Notes')
  })

  it('updates template text on user input', async () => {
    await renderPopover()
    const textarea = screen.getByTestId('template-textarea')
    fireEvent.change(textarea, { target: { value: '## New Template' } })
    expect((textarea as HTMLTextAreaElement).value).toBe('## New Template')
  })

  it('calls onChangeTemplate after debounce', async () => {
    await renderPopover()
    vi.useFakeTimers()
    try {
      const textarea = screen.getByTestId('template-textarea')
      fireEvent.change(textarea, { target: { value: '## Debounced' } })

      // Should not be called immediately
      expect(onChangeTemplate).not.toHaveBeenCalled()

      // Fast-forward past debounce and flush the resulting state update.
      await act(async () => {
        vi.advanceTimersByTime(600)
      })

      expect(onChangeTemplate).toHaveBeenCalledWith('## Debounced')
    } finally {
      vi.useRealTimers()
    }
  })

  it('treats null template as empty string', async () => {
    await renderPopover({ currentTemplate: null })
    const textarea = screen.getByTestId('template-textarea') as HTMLTextAreaElement
    expect(textarea.value).toBe('')
  })
})

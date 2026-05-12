import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TYPE_ICON_IMAGE_OPTIONS } from '../utils/typeIconImages'
import { TypeImagePicker } from './TypeImagePicker'

describe('TypeImagePicker', () => {
  it('renders the built-in scrollable SVG badge set', () => {
    render(<TypeImagePicker selectedIcon={null} onSelectIcon={() => {}} />)

    expect(screen.getByLabelText('Built-in type image badges')).toBeInTheDocument()
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(TYPE_ICON_IMAGE_OPTIONS.length)
    expect(screen.getByRole('button', { name: 'Spelllink badge' })).toBeInTheDocument()
  })

  it('selects a built-in image badge', () => {
    const onSelectIcon = vi.fn()
    render(<TypeImagePicker selectedIcon={null} onSelectIcon={onSelectIcon} />)

    fireEvent.click(screen.getByRole('button', { name: 'Graph badge' }))

    expect(onSelectIcon).toHaveBeenCalledWith(expect.stringMatching(/^data:image\/svg\+xml/))
  })

  it('marks the selected badge as pressed', () => {
    const selected = TYPE_ICON_IMAGE_OPTIONS.find((option) => option.label === 'Canvas badge')!
    render(<TypeImagePicker selectedIcon={selected.value} onSelectIcon={() => {}} />)

    expect(screen.getByRole('button', { name: 'Canvas badge' })).toHaveAttribute('aria-pressed', 'true')
  })
})

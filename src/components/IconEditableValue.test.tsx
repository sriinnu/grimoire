import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { IconEditableValue } from './IconEditableValue'

function renderIconValue(overrides: Partial<React.ComponentProps<typeof IconEditableValue>> = {}) {
  const onSave = vi.fn()
  const onCancel = vi.fn()
  const onStartEdit = vi.fn()

  render(
    <IconEditableValue
      value=""
      onSave={onSave}
      onCancel={onCancel}
      isEditing
      onStartEdit={onStartEdit}
      {...overrides}
    />,
  )

  return { onSave, onCancel, onStartEdit }
}

describe('IconEditableValue', () => {
  it('left-aligns the icon display in view mode', () => {
    render(
      <IconEditableValue
        value="rocket"
        onSave={vi.fn()}
        onCancel={vi.fn()}
        isEditing={false}
        onStartEdit={vi.fn()}
      />,
    )

    expect(screen.getByTestId('icon-editable-display')).toHaveClass('text-left')
  })

  it('shows searchable icon results with previews while editing', async () => {
    renderIconValue()

    expect(screen.getByTestId('icon-editable-input')).toHaveAttribute('role', 'combobox')
    expect(screen.getByTestId('icon-picker-results')).toBeInTheDocument()
    expect((await screen.findAllByRole('option')).length).toBeGreaterThan(0)
  })

  it('selects the first matching icon on Enter for icon-name queries', async () => {
    const { onSave } = renderIconValue()
    const input = screen.getByTestId('icon-editable-input')

    fireEvent.change(input, { target: { value: 'rocket' } })
    await screen.findByRole('option', { name: 'rocket' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSave).toHaveBeenCalledWith('rocket')
  })

  it('supports keyboard navigation before selecting an icon', async () => {
    const { onSave } = renderIconValue()
    const input = screen.getByTestId('icon-editable-input')

    fireEvent.change(input, { target: { value: 'file' } })
    const options = await screen.findAllByRole('option')

    expect(options.length).toBeGreaterThan(1)

    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSave).toHaveBeenCalledWith(options[1].textContent ?? '')
  })

  it('keeps manual URL values instead of forcing an icon suggestion', async () => {
    const { onSave } = renderIconValue()
    const input = screen.getByTestId('icon-editable-input')
    await screen.findByRole('option', { name: 'acorn' })

    fireEvent.change(input, { target: { value: 'https://example.com/icon.png' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSave).toHaveBeenCalledWith('https://example.com/icon.png')
  })

  it('shows an empty state when no icon matches the query', async () => {
    renderIconValue()
    const input = screen.getByTestId('icon-editable-input')

    fireEvent.change(input, { target: { value: 'totally-not-a-real-icon' } })

    expect(await screen.findByTestId('icon-picker-empty')).toHaveTextContent('No icons found')
  })
})

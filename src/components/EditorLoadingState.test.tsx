import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EditorLoadingState } from './EditorLoadingState'

describe('EditorLoadingState', () => {
  it('renders a centered SVG editor loading status', () => {
    const { container } = render(<EditorLoadingState />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading editor')
    expect(screen.getByTestId('editor-loading-state')).toHaveClass('editor-loading')
    expect(container.querySelector('svg.editor-loading__mark')).not.toBeNull()
  })
})

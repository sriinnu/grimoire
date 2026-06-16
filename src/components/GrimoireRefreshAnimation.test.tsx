import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GrimoireRefreshAnimation } from './GrimoireRefreshAnimation'

describe('GrimoireRefreshAnimation', () => {
  it('renders a branded status while preserving loading text', () => {
    render(<GrimoireRefreshAnimation />)

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.getByText('Opening the notebook')).toBeInTheDocument()
    expect(screen.getByTestId('grimoire-refresh-animation')).toBeInTheDocument()
  })
})

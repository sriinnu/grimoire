import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AiPanelHeader } from './AiPanelChrome'

describe('AiPanelChrome', () => {
  it('shows the visible provider and model route in the AI header', () => {
    render(
      <AiPanelHeader
        agentLabel="Chitragupta"
        agentRouteLabel="provider: google · model: gemini-2.5-pro"
        agentReady={true}
        canCrystallize={false}
        legacyCopy={false}
        onClose={vi.fn()}
        onCrystallize={vi.fn()}
        onNewChat={vi.fn()}
      />,
    )

    expect(screen.getByText('Chitragupta · provider: google · model: gemini-2.5-pro')).toBeInTheDocument()
  })
})

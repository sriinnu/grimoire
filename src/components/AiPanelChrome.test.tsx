import { render, screen, within } from '@testing-library/react'
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

  it('shows the agent identity as the branded header title', () => {
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

    const header = screen.getByTestId('ai-panel-header')
    expect(within(header).getByText('Chitragupta')).toBeInTheDocument()
    expect(header.querySelector('.ai-panel-header__status')).toHaveAttribute('data-agent-ready', 'true')
  })

  it('marks the status dot as not-ready when the agent is not installed', () => {
    render(
      <AiPanelHeader
        agentLabel="Chitragupta"
        agentReady={false}
        canCrystallize={false}
        legacyCopy={false}
        onClose={vi.fn()}
        onCrystallize={vi.fn()}
        onNewChat={vi.fn()}
      />,
    )

    const status = screen.getByTestId('ai-panel-header').querySelector('.ai-panel-header__status')
    expect(status).not.toHaveAttribute('data-agent-ready')
    expect(screen.getByText('Chitragupta · not installed')).toBeInTheDocument()
  })
})

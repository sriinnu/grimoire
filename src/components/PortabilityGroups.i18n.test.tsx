import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { PortabilityGroups } from './PortabilityGroups'

describe('PortabilityGroups i18n', () => {
  it('localizes second-brain readiness labels instead of hardcoding English', () => {
    render(<PortabilityGroups t={createTranslator('de')} vaultPath="/Users/sri/Vault" />)

    expect(screen.getByText('Journal-Erfassung')).toBeInTheDocument()
    expect(screen.getByText('Agenten-Arbeitsnotizen')).toBeInTheDocument()
    expect(screen.getByText('Gedächtnisgraph')).toBeInTheDocument()
    expect(screen.getByText('Kristallisierte Notizen')).toBeInTheDocument()
    expect(screen.queryByText('Journal capture')).not.toBeInTheDocument()
    expect(screen.queryByText('Memory graph')).not.toBeInTheDocument()
  })
})

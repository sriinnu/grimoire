import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  SettingsActionRow,
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './SettingsGroup'

describe('Settings grouped-form primitives', () => {
  it('renders the section title as a 15px-class heading', () => {
    render(<SettingsSectionTitle>Appearance</SettingsSectionTitle>)
    const title = screen.getByRole('heading', { level: 2, name: 'Appearance' })
    expect(title).toHaveClass('settings-section-title')
  })

  it('renders a group with the title above and the footnote below the inset container', () => {
    render(
      <SettingsGroup title="Theme" footnote="Explains the group." testId="group-under-test">
        <SettingsRow label="Row one" />
        <SettingsRow label="Row two" />
        <SettingsRow label="Row three" />
      </SettingsGroup>,
    )

    const block = screen.getByTestId('group-under-test')
    expect(block).toHaveClass('settings-group-block')

    // Title sits ABOVE the group container, footnote BELOW it — never inside.
    const children = Array.from(block.children)
    expect(children[0]).toHaveClass('settings-group-title')
    expect(children[0]).toHaveTextContent('Theme')
    expect(children[1]).toHaveClass('settings-group')
    expect(children[2]).toHaveClass('settings-group-footnote')
    expect(children[2]).toHaveTextContent('Explains the group.')

    // Rows are direct children of the group, so CSS draws N-1 inset dividers.
    const group = within(block).getByRole('group')
    const rows = Array.from(group.children).filter((child) => child.classList.contains('settings-row'))
    expect(rows).toHaveLength(3)
  })

  it('omits title and footnote elements when not provided', () => {
    render(
      <SettingsGroup testId="bare-group">
        <SettingsRow label="Only row" />
      </SettingsGroup>,
    )
    const block = screen.getByTestId('bare-group')
    expect(block.querySelector('.settings-group-title')).toBeNull()
    expect(block.querySelector('.settings-group-footnote')).toBeNull()
    expect(within(block).getByRole('group')).toBeInTheDocument()
  })

  it('renders a row with label and description left and the control pinned right', () => {
    render(
      <SettingsRow label="Editor font" description="Used for reading sheets." testId="row-under-test">
        <button type="button">Change</button>
      </SettingsRow>,
    )

    const row = screen.getByTestId('row-under-test')
    expect(row).toHaveClass('settings-row')
    expect(row).not.toHaveAttribute('data-variant')

    const text = row.querySelector('.settings-row__text')
    expect(text?.querySelector('.settings-row__label')).toHaveTextContent('Editor font')
    expect(text?.querySelector('.settings-row__description')).toHaveTextContent('Used for reading sheets.')

    const control = row.querySelector('.settings-row__control')
    expect(within(control as HTMLElement).getByRole('button', { name: 'Change' })).toBeInTheDocument()
  })

  it('renders full-width row content below the label for pickers and previews', () => {
    render(
      <SettingsRow fullWidth label="Typography roles" testId="full-row">
        <div data-testid="wide-content">Wide picker</div>
      </SettingsRow>,
    )

    const row = screen.getByTestId('full-row')
    expect(row).toHaveAttribute('data-variant', 'full')
    expect(row.querySelector('.settings-row__control')).toBeNull()
    const content = row.querySelector('.settings-row__content')
    expect(within(content as HTMLElement).getByTestId('wide-content')).toBeInTheDocument()
  })

  it('renders an action row with small trailing buttons instead of chip walls', () => {
    render(
      <SettingsActionRow
        label="Pack file"
        description="Load or export JSON."
        testId="action-row"
        actions={
          <>
            <button type="button">Load</button>
            <button type="button">Export</button>
          </>
        }
      />,
    )

    const row = screen.getByTestId('action-row')
    const actions = row.querySelector('.settings-row__actions')
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Load' })).toBeInTheDocument()
    expect(within(actions as HTMLElement).getByRole('button', { name: 'Export' })).toBeInTheDocument()
    expect(row.querySelector('.settings-row__label')).toHaveTextContent('Pack file')
    expect(row.querySelector('.settings-row__description')).toHaveTextContent('Load or export JSON.')
    // Compact rows keep the side-by-side grid: no stacked variant marker.
    expect(row).not.toHaveAttribute('data-variant')
  })

  it('stacks the action row with an inline badge, full-width description, and actions below', () => {
    render(
      <SettingsActionRow
        stacked
        label="Markdown folder"
        badge={<span data-testid="row-badge">ready</span>}
        description="A long description that needs the full row width."
        testId="stacked-row"
        actions={
          <>
            <button type="button">Preview</button>
            <button type="button">Import</button>
          </>
        }
      />,
    )

    const row = screen.getByTestId('stacked-row')
    expect(row).toHaveAttribute('data-variant', 'stacked')

    // Header line: label with the badge inline beside it.
    const label = row.querySelector('.settings-row__label')
    expect(label).toHaveTextContent('Markdown folder')
    expect(within(label as HTMLElement).getByTestId('row-badge')).toBeInTheDocument()
    expect(label?.querySelector('.settings-row__badge')).not.toBeNull()

    // Description below the header, actions as the row's own trailing line.
    const children = Array.from(row.children)
    expect(children[0]).toHaveClass('settings-row__text')
    expect(children[1]).toHaveClass('settings-row__actions')
    expect(within(children[1] as HTMLElement).getByRole('button', { name: 'Preview' })).toBeInTheDocument()
    expect(within(children[1] as HTMLElement).getByRole('button', { name: 'Import' })).toBeInTheDocument()
  })

  it('omits the actions line entirely when a stacked row has no actions', () => {
    render(
      <SettingsActionRow
        stacked
        label="Vault folder"
        description="Already portable."
        testId="stacked-actionless-row"
        actions={null}
      />,
    )

    const row = screen.getByTestId('stacked-actionless-row')
    expect(row.querySelector('.settings-row__actions')).toBeNull()
  })
})

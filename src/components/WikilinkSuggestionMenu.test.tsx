import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { WikilinkSuggestionMenu, type WikilinkSuggestionItem } from './WikilinkSuggestionMenu'

describe('WikilinkSuggestionMenu', () => {
  it('delegates item clicks to the controller callback only once', () => {
    const itemClick = vi.fn()
    const controllerClick = vi.fn()
    const items: WikilinkSuggestionItem[] = [{
      title: '#research',
      onItemClick: itemClick,
      path: 'research',
    }]

    render(
      <WikilinkSuggestionMenu
        items={items}
        loadingState="loaded"
        selectedIndex={0}
        onItemClick={(item) => {
          controllerClick(item)
          item.onItemClick()
        }}
      />,
    )

    fireEvent.click(screen.getByText('#research'))

    expect(controllerClick).toHaveBeenCalledTimes(1)
    expect(itemClick).toHaveBeenCalledTimes(1)
  })
})

import type { KeyboardEvent } from 'react'
import { Glyph } from '../glyphs/Glyph'
import { Input } from '@/components/ui/input'
import { APP_COMMAND_IDS, getAppCommandShortcutDisplay } from '../../hooks/appCommandCatalog'
import { isMac } from '../../utils/platform'

interface SidebarSearchLauncherProps {
  onOpenSearch?: (initialQuery?: string) => void
}

function ariaSearchShortcut(): string {
  return isMac() ? 'Meta+Shift+F' : 'Control+Shift+F'
}

function keyboardSeed(event: KeyboardEvent<HTMLInputElement>): string | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key === 'Enter' || event.key === ' ') return ''
  return event.key.length === 1 ? event.key : null
}

/** Opens the notebook Spotlight search from the left sidebar. */
export function SidebarSearchLauncher({ onOpenSearch }: SidebarSearchLauncherProps) {
  if (!onOpenSearch) return null
  const searchShortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.editFindInVault)

  return (
    <div className="border-b border-border px-2.5 py-2" data-testid="sidebar-search-launcher">
      <div className="relative">
        <Glyph
          name="search"
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        {searchShortcut && (
          <span
            className="pointer-events-none absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-md border border-border/70 bg-background/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-muted-foreground shadow-sm"
            data-testid="sidebar-search-shortcut"
          >
            {searchShortcut}
          </span>
        )}
        <Input
          type="search"
          readOnly
          value=""
          placeholder="Search"
          className="h-10 cursor-pointer rounded-xl border-border/75 bg-background/75 pl-9 pr-16 text-[12px] font-semibold text-foreground shadow-[0_10px_28px_-24px_var(--shadow-dialog)] placeholder:text-muted-foreground hover:border-primary/45 hover:bg-accent/70 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/25"
          onClick={() => onOpenSearch()}
          onKeyDown={(event) => {
            const seed = keyboardSeed(event)
            if (seed === null) return
            event.preventDefault()
            onOpenSearch(seed)
          }}
          aria-keyshortcuts={ariaSearchShortcut()}
          aria-label="Search notebook"
          title="Search notebook"
          data-testid="sidebar-search-input"
        />
      </div>
    </div>
  )
}

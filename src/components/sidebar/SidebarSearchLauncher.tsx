import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  APP_COMMAND_IDS,
  getAppCommandShortcutDisplay,
} from '../../hooks/appCommandCatalog'

interface SidebarSearchLauncherProps {
  onOpenSearch?: () => void
}

/** Opens the vault-wide Spotlight search from the left sidebar. */
export function SidebarSearchLauncher({ onOpenSearch }: SidebarSearchLauncherProps) {
  if (!onOpenSearch) return null

  const shortcut = getAppCommandShortcutDisplay(APP_COMMAND_IDS.editFindInVault) ?? ''
  const title = shortcut ? `Search open vaults (${shortcut})` : 'Search open vaults'

  return (
    <div className="border-b border-border px-2 py-2" data-testid="sidebar-search-launcher">
      <Button
        type="button"
        variant="ghost"
        className="h-9 w-full justify-start gap-2 rounded-md border border-border/70 bg-background/45 px-2.5 text-left text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-foreground"
        onClick={onOpenSearch}
        aria-label="Search open vaults"
        title={title}
        data-testid="sidebar-search-button"
      >
        <Search size={15} strokeWidth={2.25} className="shrink-0" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium">Search vaults</span>
        {shortcut ? (
          <kbd className="rounded border border-border/70 bg-muted/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {shortcut}
          </kbd>
        ) : null}
      </Button>
    </div>
  )
}

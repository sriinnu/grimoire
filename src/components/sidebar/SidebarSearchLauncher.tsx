import { Search } from 'lucide-react'
import type { KeyboardEvent } from 'react'
import { Input } from '@/components/ui/input'

interface SidebarSearchLauncherProps {
  onOpenSearch?: (initialQuery?: string) => void
}

function keyboardSeed(event: KeyboardEvent<HTMLInputElement>): string | null {
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.key === 'Enter' || event.key === ' ') return ''
  return event.key.length === 1 ? event.key : null
}

/** Opens the open-vault Spotlight search from the left sidebar. */
export function SidebarSearchLauncher({ onOpenSearch }: SidebarSearchLauncherProps) {
  if (!onOpenSearch) return null

  return (
    <div className="border-b border-border px-2.5 py-2" data-testid="sidebar-search-launcher">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
          size={15}
          strokeWidth={2.3}
          aria-hidden="true"
        />
        <Input
          type="search"
          readOnly
          value=""
          placeholder="Search open vaults..."
          className="h-10 cursor-pointer rounded-xl border-border/75 bg-background/75 pl-9 pr-3 text-[12px] font-semibold text-foreground shadow-[0_10px_28px_-24px_var(--shadow-dialog)] placeholder:text-muted-foreground hover:border-primary/45 hover:bg-accent/70 focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/25"
          onClick={() => onOpenSearch()}
          onKeyDown={(event) => {
            const seed = keyboardSeed(event)
            if (seed === null) return
            event.preventDefault()
            onOpenSearch(seed)
          }}
          aria-label="Search open vaults"
          title="Search open vaults"
          data-testid="sidebar-search-input"
        />
      </div>
    </div>
  )
}

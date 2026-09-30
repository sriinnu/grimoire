import { useRef, useEffect, type ComponentType, type SVGAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { NoteTitleIcon } from './NoteTitleIcon'
import { TypeIconMark } from './TypeIconMark'

export interface NoteSearchResultItem {
  title: string
  noteIcon?: string | null
  noteType?: string
  typeColor?: string
  typeLightColor?: string
  TypeIcon?: ComponentType<SVGAttributes<SVGSVGElement>>
  typeIconValue?: string | null
}

interface NoteSearchListProps<T extends NoteSearchResultItem> {
  items: T[]
  selectedIndex: number
  getItemKey: (item: T, index: number) => string
  onItemClick: (item: T, index: number) => void
  onItemHover?: (index: number) => void
  emptyMessage?: string
  className?: string
}

export function NoteSearchList<T extends NoteSearchResultItem>({
  items,
  selectedIndex,
  getItemKey,
  onItemClick,
  onItemHover,
  emptyMessage = 'No results',
  className,
}: NoteSearchListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.children[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (items.length === 0) {
    return (
      <div ref={listRef} className={cn('py-1', className)}>
        <div className="px-4 py-3 text-center text-[13px] text-muted-foreground">
          {emptyMessage}
        </div>
      </div>
    )
  }

  return (
    <div ref={listRef} className={cn('py-1', className)}>
      {items.map((item, i) => (
        <div
          key={getItemKey(item, i)}
          className={cn(
            'mx-2 flex h-9 cursor-pointer items-center justify-between gap-3 rounded-md px-3 transition-colors',
            i === selectedIndex
              ? 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)]'
              : 'hover:bg-[color-mix(in_srgb,var(--primary)_6%,transparent)]',
          )}
          data-selected={i === selectedIndex ? 'true' : undefined}
          onClick={() => onItemClick(item, i)}
          onMouseEnter={() => onItemHover?.(i)}
        >
          <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-sm text-foreground">
            <span className="flex size-5 shrink-0 items-center justify-center">
              {item.noteIcon ? (
                <NoteTitleIcon icon={item.noteIcon} size={16} testId="note-search-item-icon" />
              ) : (
                <TypeIconMark
                  className="shrink-0"
                  color={item.typeColor}
                  fallbackIcon={item.TypeIcon}
                  iconValue={item.typeIconValue}
                  size={16}
                  testId="note-search-item-type-icon"
                />
              )}
            </span>
            <span className="truncate">{item.title}</span>
          </span>
          {item.noteType && (
            <Badge
              variant="secondary"
              className="h-5 shrink-0 rounded-full px-2 text-[11px] font-medium"
              style={item.typeColor ? { color: item.typeColor, backgroundColor: item.typeLightColor } : undefined}
            >
              {item.noteType}
            </Badge>
          )}
        </div>
      ))}
    </div>
  )
}

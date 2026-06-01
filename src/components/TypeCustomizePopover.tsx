import { lazy, Suspense, useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { MagnifyingGlass, Smiley } from '@phosphor-icons/react'
import { useIconOptions } from '../hooks/useIconOptions'
import type { IconEntry } from '../utils/iconRegistry'
import { ACCENT_COLORS } from '../utils/typeColors'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { TypeImagePicker } from './TypeImagePicker'

const EmojiPicker = lazy(() => import('./EmojiPicker').then((module) => ({ default: module.EmojiPicker })))

const COMMON_EMOJI_OPTIONS = [
  { emoji: '🔥', label: 'fire' },
  { emoji: '✨', label: 'sparkles' },
  { emoji: '⭐', label: 'star' },
  { emoji: '🧠', label: 'brain' },
  { emoji: '📚', label: 'books' },
  { emoji: '🧪', label: 'test tube' },
  { emoji: '🚀', label: 'rocket' },
  { emoji: '📝', label: 'memo' },
] as const
type CommonEmojiOption = (typeof COMMON_EMOJI_OPTIONS)[number]
const MAX_ICON_PICKER_RESULTS = 72

function filterIcons(icons: IconEntry[], query: string): IconEntry[] {
  if (!query) return icons.slice(0, MAX_ICON_PICKER_RESULTS)
  const lower = query.toLowerCase()
  return icons.filter((o) => o.name.includes(lower)).slice(0, MAX_ICON_PICKER_RESULTS)
}

function filterCommonEmoji(query: string): readonly CommonEmojiOption[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return COMMON_EMOJI_OPTIONS
  return COMMON_EMOJI_OPTIONS.filter(({ emoji, label }) => (
    label.includes(normalizedQuery) || emoji.includes(query.trim())
  ))
}

interface TypeCustomizePopoverProps {
  currentIcon: string | null
  currentColor: string | null
  currentTemplate: string | null
  onChangeIcon: (icon: string) => void
  onChangeColor: (color: string) => void
  onChangeTemplate: (template: string) => void
  onClose: () => void
}

/** Debounce a callback by `delay` ms. Returns a stable ref-based wrapper. */
function useDebouncedCallback(fn: (v: string) => void, delay: number): (v: string) => void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  useEffect(() => () => { clearTimeout(timerRef.current) }, [])

  return useCallback((v: string) => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => fnRef.current(v), delay)
  }, [delay])
}

function EmojiPickerLoadingFallback({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [query, setQuery] = useState('')
  const emojiOptions = filterCommonEmoji(query)

  return (
    <div className="mt-2 rounded-md border border-border bg-muted/35 p-2">
      <Input
        aria-label="Search emoji"
        className="h-8 text-[12px]"
        data-testid="emoji-picker-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search emoji..."
        value={query}
      />
      <div className="mt-2 grid grid-cols-8 gap-1">
        {emojiOptions.map(({ emoji, label }) => (
          <Button
            aria-label={label}
            className="h-8 w-8 text-lg"
            data-testid="emoji-option"
            key={emoji}
            onClick={() => onSelect(emoji)}
            size="icon-sm"
            type="button"
            variant="ghost"
          >
            {emoji}
          </Button>
        ))}
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">
        Loading full emoji catalog...
      </div>
    </div>
  )
}

/** Popover for editing a type's visual identity and default note template. */
export function TypeCustomizePopover({
  currentIcon,
  currentColor,
  currentTemplate,
  onChangeIcon,
  onChangeColor,
  onChangeTemplate,
  onClose,
}: TypeCustomizePopoverProps) {
  const [selectedColor, setSelectedColor] = useState(currentColor)
  const [selectedIcon, setSelectedIcon] = useState(currentIcon)
  const [search, setSearch] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [templateText, setTemplateText] = useState(currentTemplate ?? '')
  const {
    ensureFullCatalog,
    fullCatalogLoaded,
    iconOptions,
    iconsLoaded,
    isFullCatalogLoading,
  } = useIconOptions()

  const filteredIcons = useMemo(() => filterIcons(iconOptions, search), [iconOptions, search])
  const searchNeedsFullCatalog = search.trim().length > 0 && !fullCatalogLoaded

  useEffect(() => {
    if (search.trim().length > 0) ensureFullCatalog()
  }, [ensureFullCatalog, search])

  const handleColorClick = (key: string) => {
    setSelectedColor(key)
    onChangeColor(key)
  }

  const handleIconClick = (name: string) => {
    setSelectedIcon(name)
    onChangeIcon(name)
    setShowEmojiPicker(false)
  }

  const debouncedSaveTemplate = useDebouncedCallback(onChangeTemplate, 500)

  const handleTemplateChange = (value: string) => {
    setTemplateText(value)
    debouncedSaveTemplate(value)
  }

  return (
    <div
      className="bg-popover text-popover-foreground z-50 rounded-lg border shadow-md"
      style={{ width: 320, padding: 12 }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.stopPropagation()}
    >
      {/* Color section */}
      <div className="font-mono-overline mb-2 text-muted-foreground">Color</div>
      <div className="flex gap-2 mb-3 flex-wrap">
        {ACCENT_COLORS.map((c) => (
          <Button
            key={c.key}
            aria-label={c.label}
            aria-pressed={selectedColor === c.key}
            className={cn(
              "h-6 w-6 rounded-full border-2 p-0 transition-all",
              selectedColor === c.key ? "border-foreground scale-110" : "border-transparent hover:scale-105",
            )}
            style={{ width: 24, height: 24, backgroundColor: c.css, border: selectedColor === c.key ? '2px solid var(--foreground)' : '2px solid transparent' }}
            onClick={() => handleColorClick(c.key)}
            title={c.label}
            type="button"
            variant="ghost"
          />
        ))}
      </div>

      {/* Icon section */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="font-mono-overline text-muted-foreground">Icon</div>
        {!fullCatalogLoaded ? (
          <Button
            className="h-6 px-2 text-[10px]"
            data-testid="load-full-icon-catalog"
            disabled={isFullCatalogLoading}
            onClick={ensureFullCatalog}
            size="xs"
            type="button"
            variant="outline"
          >
            {isFullCatalogLoading ? 'Loading' : 'Full catalog'}
          </Button>
        ) : (
          <span className="text-[10px] text-muted-foreground">Full catalog</span>
        )}
      </div>
      <div className="relative mb-3">
        <TypeImagePicker selectedIcon={selectedIcon} onSelectIcon={handleIconClick} />
        <Button
          aria-expanded={showEmojiPicker}
          aria-label="Choose emoji icon"
          className="mt-2 h-8 px-2"
          onClick={() => setShowEmojiPicker((value) => !value)}
          size="sm"
          type="button"
          variant="outline"
        >
          <Smiley size={14} />
          Emoji
        </Button>
        {showEmojiPicker && (
          <Suspense fallback={<EmojiPickerLoadingFallback onSelect={handleIconClick} />}>
            <EmojiPicker
              onClose={() => setShowEmojiPicker(false)}
              onSelect={handleIconClick}
            />
          </Suspense>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-2">
        <MagnifyingGlass
          size={14}
          className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
        />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search icons…"
          className="h-8 pl-7 text-[12px]"
        />
      </div>

      {/* Icon grid */}
      <div className="flex flex-wrap gap-1 overflow-y-auto" style={{ maxHeight: 160 }}>
        {!iconsLoaded || searchNeedsFullCatalog ? (
          <div className="w-full py-6 text-center text-[12px] text-muted-foreground">
            {searchNeedsFullCatalog ? 'Loading full icon catalog...' : 'Loading icons...'}
          </div>
        ) : filteredIcons.length === 0 ? (
          <div className="w-full py-6 text-center text-[12px] text-muted-foreground">
            No icons found
          </div>
        ) : (
          filteredIcons.map(({ name, Icon }) => (
            <Button
              key={name}
              aria-label={name}
              aria-pressed={selectedIcon === name}
              className={cn(
                "h-[30px] w-[30px] p-0 transition-colors",
                selectedIcon === name
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              onClick={() => handleIconClick(name)}
              title={name}
              type="button"
              variant="ghost"
            >
              <Icon size={16} />
            </Button>
          ))
        )}
      </div>

      {/* Template section */}
      <div className="font-mono-overline mb-2 mt-3 text-muted-foreground">Template</div>
      <Textarea
        value={templateText}
        onChange={(e) => handleTemplateChange(e.target.value)}
        placeholder="Markdown template for new notes of this type…"
        className="min-h-20 max-h-[200px] resize-y px-2 py-1.5 font-mono text-[12px]"
        style={{ minHeight: 80, maxHeight: 200 }}
        data-testid="template-textarea"
      />

      {/* Done button */}
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          type="button"
          variant="ghost"
          onClick={onClose}
        >
          Done
        </Button>
      </div>
    </div>
  )
}

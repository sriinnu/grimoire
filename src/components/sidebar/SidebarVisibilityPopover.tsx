import { Button } from '@/components/ui/button'
import { TypeIconMark } from '../TypeIconMark'
import { getTypeColor } from '../../utils/typeColors'
import type { SectionGroup } from './sidebarSectionTypes'

function resolveSectionColor(type: string, customColor?: string | null) {
  return getTypeColor(type, customColor)
}

function ToggleSwitch({ on }: { on: boolean }) {
  return (
    <div className="flex items-center" style={{ width: 32, height: 18, borderRadius: 9, padding: 2, backgroundColor: on ? 'var(--primary)' : 'var(--muted)', justifyContent: on ? 'flex-end' : 'flex-start', transition: 'background-color 150ms' }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: 'var(--background)', transition: 'transform 150ms' }} />
    </div>
  )
}

function VisibilityPopoverItem({
  group,
  isVisible,
  onToggle,
}: {
  group: SectionGroup
  isVisible: boolean
  onToggle: (type: string) => void
}) {
  const { label, type, Icon, customColor, iconValue } = group
  const sectionColor = resolveSectionColor(type, customColor)

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto w-full justify-start rounded-none px-3 py-1.5"
      style={{ padding: '6px 12px', gap: 8 }}
      onClick={() => onToggle(type)}
      aria-label={`Toggle ${label}`}
    >
      <TypeIconMark color={sectionColor} fallbackIcon={Icon} iconValue={iconValue} size={14} />
      <span className="flex-1 text-left text-[13px] text-foreground">{label}</span>
      <ToggleSwitch on={isVisible} />
    </Button>
  )
}

export function VisibilityPopover({ sections, isSectionVisible, onToggle }: {
  sections: SectionGroup[]
  isSectionVisible: (type: string) => boolean
  onToggle: (type: string) => void
}) {
  return (
    <div
      className="border border-border bg-popover text-popover-foreground"
      style={{ position: 'absolute', top: '100%', left: 6, right: 6, zIndex: 50, borderRadius: 8, padding: '8px 0', boxShadow: '0 4px 12px var(--shadow-dialog)' }}
    >
      <div className="text-[12px] font-semibold text-muted-foreground" style={{ padding: '0 12px 4px' }}>Show places</div>
      {sections.map((group) => (
        <VisibilityPopoverItem
          key={group.type}
          group={group}
          isVisible={isSectionVisible(group.type)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

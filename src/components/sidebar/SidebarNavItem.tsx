import type { ComponentType, CSSProperties } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { SIDEBAR_ITEM_PADDING } from './sidebarStyles'

const SIDEBAR_COUNT_PILL_STYLE = {
  borderRadius: 9999,
  padding: '0 6px',
  fontSize: 10,
  fontVariantNumeric: 'tabular-nums',
} as const

function hasSidebarCount(count?: number): count is number {
  return count !== undefined && count > 0
}

function getNavItemPadding(compact: boolean | undefined, hasCount: boolean) {
  if (compact) return hasCount ? SIDEBAR_ITEM_PADDING.compactWithCount : SIDEBAR_ITEM_PADDING.compact
  return hasCount ? SIDEBAR_ITEM_PADDING.withCount : SIDEBAR_ITEM_PADDING.regular
}

function getNavItemIconSize(compact?: boolean) {
  return compact ? 18 : 20
}

function getNavItemTextClass(compact?: boolean) {
  return compact ? 'text-[12px]' : 'text-[13px]'
}

function resolveBadgeClassName(
  isActive: boolean | undefined,
  activeBadgeClassName: string | undefined,
  badgeClassName: string | undefined,
) {
  if (isActive && activeBadgeClassName) return activeBadgeClassName
  return badgeClassName
}

function resolveBadgeStyle(
  isActive: boolean | undefined,
  activeBadgeClassName: string | undefined,
  activeBadgeStyle: CSSProperties | undefined,
  badgeStyle: CSSProperties | undefined,
) {
  if (isActive && activeBadgeClassName) return activeBadgeStyle
  return badgeStyle
}

function SidebarNavIcon({
  Icon,
  emoji,
  iconSize,
  isActive,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  iconSize: number
  isActive?: boolean
}) {
  const glyphClassName = cn('sidebar-nav-glyph', emoji && 'sidebar-nav-glyph--emoji')
  if (emoji) {
    return (
      <span className={glyphClassName} data-active={isActive ? 'true' : 'false'}>
        <span style={{ fontSize: iconSize, lineHeight: 1, width: iconSize, textAlign: 'center' }}>{emoji}</span>
      </span>
    )
  }
  return (
    <span className={glyphClassName} data-active={isActive ? 'true' : 'false'}>
      <Icon className="sidebar-nav-glyph__icon" size={iconSize} weight={isActive ? 'duotone' : 'regular'} />
    </span>
  )
}

export function SidebarCountPill({
  count,
  className,
  style,
  compact,
  testId = 'sidebar-count-chip',
}: {
  count: number
  className?: string
  style?: CSSProperties
  compact?: boolean
  testId?: string
}) {
  return (
    <span
      data-testid={testId}
      className={cn("flex items-center justify-center", className)}
      style={{ height: compact ? 18 : 20, ...SIDEBAR_COUNT_PILL_STYLE, ...style }}
    >
      {count}
    </span>
  )
}

function NavItemLabel({ label, compact }: { label: string; compact?: boolean }) {
  return <span className={cn("flex-1 font-medium", getNavItemTextClass(compact))}>{label}</span>
}

function NavItemCount({
  count,
  className,
  style,
  compact,
}: {
  count?: number
  className?: string
  style?: CSSProperties
  compact?: boolean
}) {
  if (!hasSidebarCount(count)) return null
  return (
    <SidebarCountPill
      count={count}
      className={className}
      style={style}
      compact={compact}
    />
  )
}

function DisabledNavItem({
  Icon,
  emoji,
  label,
  compact,
  disabledTooltip,
  padding,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  compact?: boolean
  disabledTooltip?: string
  padding: ReturnType<typeof getNavItemPadding>
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      disabled
      className="h-auto w-full select-none justify-start gap-2 rounded text-foreground disabled:opacity-40"
      style={{ padding, borderRadius: 4, cursor: 'not-allowed' }}
      title={disabledTooltip ?? "Coming soon"}
    >
      <SidebarNavIcon Icon={Icon} emoji={emoji} iconSize={getNavItemIconSize(compact)} />
      <NavItemLabel label={label} compact={compact} />
    </Button>
  )
}

function ClickableNavItem({
  Icon,
  emoji,
  label,
  count,
  isActive,
  activeClassName,
  badgeClassName,
  badgeStyle,
  activeBadgeClassName,
  activeBadgeStyle,
  onClick,
  compact,
  padding,
}: {
  Icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  count?: number
  isActive?: boolean
  activeClassName: string
  badgeClassName?: string
  badgeStyle?: CSSProperties
  activeBadgeClassName?: string
  activeBadgeStyle?: CSSProperties
  onClick?: () => void
  compact?: boolean
  padding: ReturnType<typeof getNavItemPadding>
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        "h-auto w-full cursor-pointer select-none justify-start gap-2 rounded text-left transition-colors",
        isActive ? activeClassName : "text-foreground hover:bg-accent",
      )}
      style={{ padding, borderRadius: 4 }}
      onClick={onClick}
    >
      <SidebarNavIcon Icon={Icon} emoji={emoji} iconSize={getNavItemIconSize(compact)} isActive={isActive} />
      <NavItemLabel label={label} compact={compact} />
      <NavItemCount
        count={count}
        className={resolveBadgeClassName(isActive, activeBadgeClassName, badgeClassName)}
        style={resolveBadgeStyle(isActive, activeBadgeClassName, activeBadgeStyle, badgeStyle)}
        compact={compact}
      />
    </Button>
  )
}

export function NavItem({ icon: Icon, emoji, label, count, isActive, activeClassName = 'text-foreground', badgeClassName, badgeStyle, activeBadgeClassName, activeBadgeStyle, onClick, disabled, disabledTooltip, compact }: {
  icon: ComponentType<IconProps>
  emoji?: string | null
  label: string
  count?: number
  isActive?: boolean
  activeClassName?: string
  badgeClassName?: string
  badgeStyle?: CSSProperties
  activeBadgeClassName?: string
  activeBadgeStyle?: CSSProperties
  onClick?: () => void
  disabled?: boolean
  disabledTooltip?: string
  compact?: boolean
}) {
  const padding = getNavItemPadding(compact, hasSidebarCount(count))
  if (disabled) {
    return (
      <DisabledNavItem
        Icon={Icon}
        emoji={emoji}
        label={label}
        compact={compact}
        disabledTooltip={disabledTooltip}
        padding={padding}
      />
    )
  }

  return (
    <ClickableNavItem
      Icon={Icon}
      emoji={emoji}
      label={label}
      count={count}
      isActive={isActive}
      activeClassName={activeClassName}
      badgeClassName={badgeClassName}
      badgeStyle={badgeStyle}
      activeBadgeClassName={activeBadgeClassName}
      activeBadgeStyle={activeBadgeStyle}
      onClick={onClick}
      compact={compact}
      padding={padding}
    />
  )
}

import { createElement, useEffect, useState, type ComponentType } from 'react'
import {
  ArrowsClockwise,
  Book,
  BookOpen,
  Calendar,
  CalendarBlank,
  CookingPot,
  FileText,
  Flask,
  GearSix,
  Leaf,
  Megaphone,
  Rocket,
  Sparkle,
  StackSimple,
  Tag,
  Target,
  User,
  Users,
  Wrench,
  type IconProps,
} from '@phosphor-icons/react'
import {
  BrainIcon,
  GrimoireStarIcon,
  PuranasIcon,
  RishiIcon,
  SecondBrainIcon,
  ShaastrasIcon,
  VedasIcon,
} from '../components/icons/grimoireKnowledgeIcons'
import { ICON_OPTION_NAMES, isKnownIconOptionName } from './iconOptionNames'

export type { IconProps }
export type IconEntry = { name: string; Icon: ComponentType<IconProps> }

const RUNTIME_ICON_MAP: Record<string, ComponentType<IconProps>> = {
  'arrows-clockwise': ArrowsClockwise,
  book: Book,
  'book-open': BookOpen,
  brain: BrainIcon,
  calendar: Calendar,
  'calendar-blank': CalendarBlank,
  'cooking-pot': CookingPot,
  'file-text': FileText,
  flask: Flask,
  'gear-six': GearSix,
  leaf: Leaf,
  megaphone: Megaphone,
  rocket: Rocket,
  sparkle: Sparkle,
  sparkles: Sparkle,
  stack: StackSimple,
  'stack-simple': StackSimple,
  star: GrimoireStarIcon,
  tag: Tag,
  target: Target,
  user: User,
  users: Users,
  veda: VedasIcon,
  vedas: VedasIcon,
  purana: PuranasIcon,
  puranas: PuranasIcon,
  rishi: RishiIcon,
  shastra: ShaastrasIcon,
  shaastras: ShaastrasIcon,
  'second-brain': SecondBrainIcon,
  wrench: Wrench,
}
const COMMON_ICON_NAMES = [
  'file-text',
  'brain',
  'second-brain',
  'vedas',
  'shaastras',
  'puranas',
  'rishi',
  'star',
  'book-open',
  'calendar',
  'tag',
  'target',
  'rocket',
  'sparkle',
  'wrench',
  'cooking-pot',
  'leaf',
  'flask',
] as const

export const COMMON_ICON_OPTIONS: IconEntry[] = COMMON_ICON_NAMES.map((name) => ({
  Icon: RUNTIME_ICON_MAP[name],
  name,
}))

const deferredIconCache = new Map<string, ComponentType<IconProps>>()
const resolvedFullIconCache = new Map<string, ComponentType<IconProps> | null>()

export function normalizeIconName(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, '-')
}

export function loadIconOptions(): Promise<IconEntry[]> {
  return Promise.resolve(ICON_OPTION_NAMES.map((name) => ({
    Icon: RUNTIME_ICON_MAP[name] ?? createDeferredIcon(name),
    name,
  })))
}

async function loadFullIcon(normalizedName: string): Promise<ComponentType<IconProps> | null> {
  if (resolvedFullIconCache.has(normalizedName)) {
    return resolvedFullIconCache.get(normalizedName) ?? null
  }

  const module = await import('./phosphorIconLoaders')
  const Icon = await module.loadPhosphorIcon(normalizedName)
  resolvedFullIconCache.set(normalizedName, Icon)
  return Icon
}

function createDeferredIcon(normalizedName: string): ComponentType<IconProps> {
  const cached = deferredIconCache.get(normalizedName)
  if (cached) return cached

  function DeferredIcon(props: IconProps) {
    const [Icon, setIcon] = useState<ComponentType<IconProps> | null>(
      () => resolvedFullIconCache.get(normalizedName) ?? null,
    )

    useEffect(() => {
      let cancelled = false
      void loadFullIcon(normalizedName).then((loadedIcon) => {
        if (!cancelled) setIcon(() => loadedIcon)
      })
      return () => {
        cancelled = true
      }
    }, [])

    return Icon ? createElement(Icon, props) : null
  }
  DeferredIcon.displayName = `DeferredIcon(${normalizedName})`

  deferredIconCache.set(normalizedName, DeferredIcon)
  return DeferredIcon
}

function resolveDeferredIcon(name: string): ComponentType<IconProps> | null {
  const normalizedName = normalizeIconName(name)
  return isKnownIconOptionName(normalizedName) ? createDeferredIcon(normalizedName) : null
}

/** Resolves a curated icon name to its component, without a fallback. */
export function findIcon(name: string | null | undefined): ComponentType<IconProps> | null {
  if (!name) return null
  const normalizedName = normalizeIconName(name)
  return RUNTIME_ICON_MAP[normalizedName] ?? resolveDeferredIcon(normalizedName)
}

/** Resolves a curated icon name to its component, with fallback to FileText. */
export function resolveIcon(name: string | null): ComponentType<IconProps> {
  return findIcon(name) ?? FileText
}

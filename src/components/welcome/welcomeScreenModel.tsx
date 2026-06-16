import type { ReactNode, RefObject } from 'react'
import { AlertTriangle } from 'lucide-react'
import grimoireIcon from '@/assets/app-icon.png'
import type { WelcomeScreenProps } from './WelcomeScreenTypes'
import { BRAND_ICON_STYLE } from './welcomeScreenStyles'

export interface WelcomeScreenPresentation {
  heroBackground: string
  heroIcon: ReactNode
  openFolderLabel: string
  openFolderDescription: string
  subtitle: string
  templateDescription: string
  title: string
  emptyVaultDescription: string
}

export function isWelcomeActivationKey(event: globalThis.KeyboardEvent): boolean {
  return event.key === 'Enter' || event.key === ' '
}

export function isWelcomeNavigationKey(event: globalThis.KeyboardEvent): boolean {
  return event.key === 'Tab' || event.key === 'ArrowDown' || event.key === 'ArrowUp'
}

export function nextWelcomeActionIndex(
  currentIndex: number,
  event: globalThis.KeyboardEvent,
  actionCount: number,
): number {
  const direction = event.key === 'ArrowUp' || (event.key === 'Tab' && event.shiftKey) ? -1 : 1
  return (currentIndex + direction + actionCount) % actionCount
}

export function focusBelongsToWelcomeActions(
  activeElement: Element | null,
  actionButtonRefs: RefObject<HTMLButtonElement | null>[],
): boolean {
  return activeElement === document.body
    || actionButtonRefs.some(({ current }) => current === activeElement)
}

export function getFocusedWelcomeActionIndex(
  activeElement: Element | null,
  actionButtonRefs: RefObject<HTMLButtonElement | null>[],
): number {
  return Math.max(
    0,
    actionButtonRefs.findIndex(({ current }) => current === activeElement),
  )
}

export function focusWelcomeAction(
  actionButtonRefs: RefObject<HTMLButtonElement | null>[],
  actionIndex: number,
): void {
  actionButtonRefs[actionIndex]?.current?.focus()
}

export function getWelcomeScreenPresentation(
  mode: WelcomeScreenProps['mode'],
  defaultVaultPath: string,
  isOffline: boolean,
): WelcomeScreenPresentation {
  if (mode === 'welcome') {
    return {
      heroBackground: 'transparent',
      heroIcon: <img src={grimoireIcon} alt="Grimoire icon" style={BRAND_ICON_STYLE} />,
      openFolderDescription: 'Point to any local, iCloud Drive, or Google Drive folder. Git stays optional.',
      openFolderLabel: 'Open notebook folder',
      subtitle: 'One plain Markdown notebook. Local by default. Git optional.',
      templateDescription: isOffline
        ? `Uses the bundled Getting Started notebook while offline. Suggested path: ${defaultVaultPath}`
        : 'Download the Getting Started notebook, with a bundled fallback if the network is unavailable.',
      title: 'Welcome to Grimoire',
      emptyVaultDescription: 'Create a local Markdown notebook with Grimoire defaults. No Git required.',
    }
  }

  return {
    heroBackground: 'var(--accent-yellow-light)',
    heroIcon: <AlertTriangle size={28} style={{ color: 'var(--accent-orange)' }} />,
    openFolderDescription: 'Point to another local or cloud-synced folder you control.',
    openFolderLabel: 'Choose a different folder',
    subtitle: 'The notebook folder could not be found on disk.\nIt may have been moved or deleted.',
    templateDescription: isOffline
      ? `Uses the bundled Getting Started notebook while offline. Suggested path: ${defaultVaultPath}`
      : 'Download the Getting Started notebook, with a bundled fallback if the network is unavailable.',
    title: 'Notebook not found',
    emptyVaultDescription: 'Create a replacement local Markdown notebook. No Git required.',
  }
}

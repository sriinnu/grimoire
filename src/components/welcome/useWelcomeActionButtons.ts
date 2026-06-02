import { useEffect, useMemo, useRef } from 'react'
import type { WelcomeAction, WelcomeScreenProps } from './WelcomeScreenTypes'
import {
  focusBelongsToWelcomeActions,
  focusWelcomeAction,
  getFocusedWelcomeActionIndex,
  isWelcomeActivationKey,
  isWelcomeNavigationKey,
  nextWelcomeActionIndex,
} from './welcomeScreenModel'

function triggerWelcomeAction(
  actionIndex: number,
  actions: WelcomeAction[],
): void {
  const action = actions[actionIndex]
  if (!action?.disabled) action.run()
}

export function useWelcomeActionButtons({
  mode,
  busy,
  onCreateEmptyVault,
  onOpenFolder,
  onCreateVault,
}: Pick<
  WelcomeScreenProps,
  'mode' | 'onCreateEmptyVault' | 'onOpenFolder' | 'onCreateVault'
> & {
  busy: boolean
}) {
  const templateActionRef = useRef<HTMLButtonElement>(null)
  const createEmptyActionRef = useRef<HTMLButtonElement>(null)
  const openFolderActionRef = useRef<HTMLButtonElement>(null)
  const actionButtonRefs = useMemo(
    () => [templateActionRef, createEmptyActionRef, openFolderActionRef],
    [],
  )
  const actions = useMemo<WelcomeAction[]>(
    () => ([
      { disabled: false, run: onCreateVault },
      { disabled: false, run: onCreateEmptyVault },
      { disabled: false, run: onOpenFolder },
    ]),
    [onCreateEmptyVault, onCreateVault, onOpenFolder],
  )

  useEffect(() => {
    if (busy) return

    // WKWebView can ignore `autoFocus`; move focus explicitly so keyboard-only
    // onboarding always starts on the guided template flow.
    focusWelcomeAction(actionButtonRefs, 0)
  }, [actionButtonRefs, busy, mode])

  useEffect(() => {
    if (busy) return

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      const activeElement = document.activeElement
      if (!focusBelongsToWelcomeActions(activeElement, actionButtonRefs)) return

      const actionIndex = getFocusedWelcomeActionIndex(activeElement, actionButtonRefs)
      if (isWelcomeNavigationKey(event)) {
        event.preventDefault()
        focusWelcomeAction(
          actionButtonRefs,
          nextWelcomeActionIndex(actionIndex, event, actionButtonRefs.length),
        )
        return
      }

      if (!isWelcomeActivationKey(event)) return

      event.preventDefault()
      triggerWelcomeAction(actionIndex, actions)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [actionButtonRefs, actions, busy])

  return {
    templateActionRef,
    createEmptyActionRef,
    openFolderActionRef,
  }
}

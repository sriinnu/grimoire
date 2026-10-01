import { useLayoutEffect, useMemo, useRef } from 'react'

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- props are heterogeneous by design
type AnyFunction = (...args: any[]) => unknown

/**
 * Returns `props` with every function-valued prop swapped for a stable wrapper
 * that always calls the latest function.
 *
 * Sriinnu: AppRuntime hands ~15 inline/derived callbacks to the memoised
 * Sidebar and NoteList. Their identities changed every render, so every
 * keystroke in the editor re-rendered both panes (and each note row) for
 * nothing. Wrapping at the pane boundary fixes it for every current and
 * future handler. Presence still matters: a handler becoming undefined (a
 * feature switched off) changes identity, so conditional UI keeps working.
 */
export function useStableFunctionProps<P extends object>(props: P): P {
  const latest = useRef(props)
  useLayoutEffect(() => {
    latest.current = props
  })

  const record = props as Record<string, unknown>
  const functionKeys = Object.keys(record).filter((key) => typeof record[key] === 'function').sort()
  const functionKeySignature = functionKeys.join('|')

  const stableFunctions = useMemo(() => {
    const wrappers: Record<string, AnyFunction> = {}
    for (const key of functionKeySignature ? functionKeySignature.split('|') : []) {
      wrappers[key] = (...args: unknown[]) => {
        const current = (latest.current as Record<string, unknown>)[key]
        return typeof current === 'function' ? (current as AnyFunction)(...args) : undefined
      }
    }
    return wrappers
  }, [functionKeySignature])

  return { ...props, ...stableFunctions }
}

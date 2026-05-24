import { useState, useEffect } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'

function tauriCall<T>(cmd: string): Promise<T> {
  return isTauri() ? invoke<T>(cmd) : mockInvoke<T>(cmd)
}

export function useBuildNumber(): string | undefined {
  const [buildNumber, setBuildNumber] = useState<string>()

  useEffect(() => {
    tauriCall<string>('get_build_number').then(setBuildNumber).catch(() => {
      setBuildNumber('b?')
    })
  }, [])

  return buildNumber
}

import { isTauri } from '../mock-tauri'

function getUserAgent(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent
}

function getNavigatorPlatform(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.platform
}

export function isLinux(): boolean {
  const userAgent = getUserAgent()
  return userAgent.includes('Linux') && !userAgent.includes('Android')
}

export function isMac(): boolean {
  const userAgent = getUserAgent()
  const platform = getNavigatorPlatform()
  return userAgent.includes('Mac OS X') || userAgent.includes('Macintosh') || platform.includes('Mac')
}

export function shouldUseLinuxWindowChrome(): boolean {
  return isTauri() && isLinux()
}

export function shouldUseMacOverlayChrome(): boolean {
  return isTauri() && isMac()
}

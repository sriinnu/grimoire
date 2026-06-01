import { isTauri } from '../mock-tauri'

export type DesktopPlatform = 'macos' | 'windows' | 'linux' | 'unknown'

function getUserAgent(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.userAgent
}

function getNavigatorPlatform(): string {
  if (typeof navigator === 'undefined') return ''
  return navigator.platform
}

export function getDesktopPlatform(): DesktopPlatform {
  const userAgent = getUserAgent()
  const platform = getNavigatorPlatform()
  if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh') || platform.includes('Mac')) {
    return 'macos'
  }
  if (userAgent.includes('Windows') || platform.includes('Win')) {
    return 'windows'
  }
  if (userAgent.includes('Linux') && !userAgent.includes('Android')) {
    return 'linux'
  }
  return 'unknown'
}

export function isLinux(): boolean {
  return getDesktopPlatform() === 'linux'
}

export function isMac(): boolean {
  return getDesktopPlatform() === 'macos'
}

export function isWindows(): boolean {
  return getDesktopPlatform() === 'windows'
}

export function desktopPlatformLabel(platform: DesktopPlatform = getDesktopPlatform()): string {
  if (platform === 'macos') return 'macOS'
  if (platform === 'windows') return 'Windows'
  if (platform === 'linux') return 'Linux'
  return 'this OS'
}

export function desktopPlatformDeviceLabel(platform: DesktopPlatform = getDesktopPlatform()): string {
  if (platform === 'macos') return 'Mac'
  if (platform === 'windows') return 'Windows PC'
  if (platform === 'linux') return 'Linux machine'
  return 'device'
}

export function desktopSecureStorageLabel(platform: DesktopPlatform = getDesktopPlatform()): string {
  if (platform === 'macos') return 'macOS Keychain'
  if (platform === 'windows') return 'Windows Credential Manager'
  if (platform === 'linux') return 'Linux Secret Service/keyring'
  return 'native secure storage'
}

export function localMachineLabel(platform: DesktopPlatform = getDesktopPlatform()): string {
  return `this ${desktopPlatformDeviceLabel(platform)}`
}

export function shouldUseLinuxWindowChrome(): boolean {
  return isTauri() && isLinux()
}

export function shouldUseMacOverlayChrome(): boolean {
  return isTauri() && isMac()
}

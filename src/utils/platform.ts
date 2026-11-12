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

/**
 * Runtime desktop-platform detection.
 *
 * Tauri does not bundle the `os` plugin, so inside a Tauri webview the signal
 * is the WebView user agent plus `navigator.platform`:
 * - WKWebView (macOS): UA carries "Macintosh"/"Mac OS X"; platform "MacIntel".
 * - WebView2 (Windows): UA carries "Windows NT"; platform "Win32"/"Win64".
 * - WebKitGTK (Linux): UA carries "Linux"; platform "Linux x86_64".
 * UAs can be sparse, so `navigator.platform` is always consulted as a fallback;
 * an unknown result degrades to 'unknown' and the platform labels say "this OS".
 */
export function getDesktopPlatform(): DesktopPlatform {
  const userAgent = getUserAgent()
  const platform = getNavigatorPlatform()
  if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh') || platform.includes('Mac')) {
    return 'macos'
  }
  if (userAgent.includes('Windows') || platform.includes('Win')) {
    return 'windows'
  }
  const mentionsLinux = userAgent.includes('Linux') || platform.includes('Linux')
  if (mentionsLinux && !userAgent.includes('Android')) {
    return 'linux'
  }
  return 'unknown'
}

/** iPhone, iPad (which claims to be a Mac) and Android: no hardware chord to advertise. */
export function isTouchPlatform(): boolean {
  const userAgent = getUserAgent()
  if (/iPhone|iPad|iPod|Android/i.test(userAgent)) return true
  if (typeof navigator === 'undefined') return false
  const touchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints ?? 0
  return userAgent.includes('Macintosh') && touchPoints > 1
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

export function revealInFileManagerLabel(platform: DesktopPlatform = getDesktopPlatform()): string {
  if (platform === 'macos') return 'Reveal in Finder'
  if (platform === 'windows') return 'Show in Explorer'
  return 'Show in file manager'
}

export function shouldUseLinuxWindowChrome(): boolean {
  return isTauri() && isLinux()
}

export function shouldUseMacOverlayChrome(): boolean {
  return isTauri() && isMac()
}

import { afterEach, describe, expect, it, vi } from 'vitest'
import { isTauri } from '../mock-tauri'
import {
  isLinux,
  isMac,
  isWindows,
  desktopPlatformDeviceLabel,
  desktopPlatformLabel,
  localMachineLabel,
  shouldUseLinuxWindowChrome,
  shouldUseMacOverlayChrome,
} from './platform'

vi.mock('../mock-tauri', () => ({
  isTauri: vi.fn(),
}))

const originalUserAgent = navigator.userAgent
const originalPlatform = navigator.platform

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function setPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

describe('platform helpers', () => {
  afterEach(() => {
    setUserAgent(originalUserAgent)
    setPlatform(originalPlatform)
    vi.mocked(isTauri).mockReturnValue(false)
  })

  it('detects Linux user agents but ignores Android', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    expect(isLinux()).toBe(true)

    setUserAgent('Mozilla/5.0 (Linux; Android 14)')
    expect(isLinux()).toBe(false)
  })

  it('detects macOS user agents', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    expect(isMac()).toBe(true)
  })

  it('detects macOS from navigator.platform when WebView user agents are sparse', () => {
    setUserAgent('Mozilla/5.0 AppleWebKit/605.1.15')
    setPlatform('MacIntel')
    expect(isMac()).toBe(true)
  })

  it('detects Windows and exposes Windows-facing labels', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    setPlatform('Win32')
    expect(isWindows()).toBe(true)
    expect(desktopPlatformLabel()).toBe('Windows')
    expect(desktopPlatformDeviceLabel()).toBe('Windows PC')
    expect(localMachineLabel()).toBe('this Windows PC')
  })

  it('exposes platform labels for macOS and Linux', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    expect(desktopPlatformLabel()).toBe('macOS')
    expect(localMachineLabel()).toBe('this Mac')

    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    setPlatform('Linux x86_64')
    expect(desktopPlatformLabel()).toBe('Linux')
    expect(localMachineLabel()).toBe('this Linux machine')
  })

  it('only enables Linux window chrome inside Tauri', () => {
    setUserAgent('Mozilla/5.0 (X11; Linux x86_64)')
    vi.mocked(isTauri).mockReturnValue(false)
    expect(shouldUseLinuxWindowChrome()).toBe(false)

    vi.mocked(isTauri).mockReturnValue(true)
    expect(shouldUseLinuxWindowChrome()).toBe(true)
  })

  it('only enables macOS overlay spacing inside Tauri', () => {
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    vi.mocked(isTauri).mockReturnValue(false)
    expect(shouldUseMacOverlayChrome()).toBe(false)

    vi.mocked(isTauri).mockReturnValue(true)
    expect(shouldUseMacOverlayChrome()).toBe(true)
  })
})

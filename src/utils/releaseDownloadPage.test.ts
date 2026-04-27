import {
  buildStableDownloadRedirectPage,
  extractStableDownloadTargets,
  extractStableDownloadTargetsFromReleases,
  resolveStableDownloadTargets,
} from './releaseDownloadPage'

describe('extractStableDownloadTargets', () => {
  it('returns stable downloads for each supported desktop platform when present', () => {
    expect(
      extractStableDownloadTargets({
        platforms: {
          'darwin-aarch64': {
            download_url: 'https://example.com/Grimoire-aarch64.dmg',
          },
          'darwin-x86_64': {
            download_url: 'https://example.com/Grimoire-x64.dmg',
          },
          'linux-x86_64': {
            download_url: 'https://example.com/Grimoire.AppImage',
          },
          'windows-x86_64': {
            url: 'https://example.com/Grimoire-setup.exe',
          },
        },
      }),
    ).toMatchObject({
      'darwin-aarch64': {
        label: 'macOS Apple Silicon',
        url: 'https://example.com/Grimoire-aarch64.dmg',
      },
      'darwin-x86_64': {
        label: 'macOS Intel',
        url: 'https://example.com/Grimoire-x64.dmg',
      },
      'linux-x86_64': {
        label: 'Linux',
        url: 'https://example.com/Grimoire.AppImage',
      },
      'windows-x86_64': {
        label: 'Windows',
        url: 'https://example.com/Grimoire-setup.exe',
      },
    })
  })
})

describe('buildStableDownloadRedirectPage', () => {
  it('builds a redirect page with platform-specific download links', () => {
    const html = buildStableDownloadRedirectPage({
      'darwin-aarch64': {
        buttonLabel: 'Download Grimoire for macOS Apple Silicon',
        label: 'macOS Apple Silicon',
        url: 'https://example.com/Grimoire-aarch64.dmg',
      },
      'darwin-x86_64': {
        buttonLabel: 'Download Grimoire for Intel Mac',
        label: 'macOS Intel',
        url: 'https://example.com/Grimoire-x64.dmg',
      },
      'windows-x86_64': {
        buttonLabel: 'Download Grimoire for Windows',
        label: 'Windows',
        url: 'https://example.com/Grimoire-setup.exe',
      },
    })

    expect(html).toContain('Grimoire Stable Download')
    expect(html).toContain('DOWNLOAD_TARGETS')
    expect(html).toContain('Download Grimoire for Windows')
    expect(html).toContain('Download Grimoire for macOS Apple Silicon')
    expect(html).toContain('Download Grimoire for Intel Mac')
    expect(html).toContain('hasMultipleMacDownloads')
    expect(html).toContain('Choose the Apple Silicon or Intel Mac download below.')
    expect(html).toContain('window.location.replace')
    expect(html).toContain('color-scheme: light dark')
    expect(html).toContain('@media (prefers-color-scheme: dark)')
    expect(html).toContain('background: var(--download-surface-page)')
  })

  it('builds a fallback page when no stable downloads exist yet', () => {
    const html = buildStableDownloadRedirectPage({})

    expect(html).toContain('Grimoire Stable Download Unavailable')
    expect(html).toContain('View release history')
    expect(html).toContain('https://sriinnu.github.io/grimoire/')
    expect(html).not.toContain('DOWNLOAD_TARGETS')
  })
})

describe('resolveStableDownloadTargets', () => {
  it('falls back to stable release assets when latest.json is incomplete', () => {
    const latestPayload = {
      platforms: {
        'darwin-aarch64': {
          download_url: 'https://example.com/Grimoire-aarch64.dmg',
        },
      },
    }
    const releasesPayload = [
      {
        prerelease: false,
        assets: [
          {
            name: 'Grimoire_x64.dmg',
            browser_download_url: 'https://example.com/Grimoire-x64.dmg',
          },
          {
            name: 'Grimoire-setup.exe',
            browser_download_url: 'https://example.com/Grimoire-setup.exe',
          },
          {
            name: 'Grimoire.AppImage',
            browser_download_url: 'https://example.com/Grimoire.AppImage',
          },
        ],
      },
    ]

    expect(extractStableDownloadTargetsFromReleases(releasesPayload)).toMatchObject({
      'darwin-x86_64': {
        url: 'https://example.com/Grimoire-x64.dmg',
      },
      'linux-x86_64': {
        url: 'https://example.com/Grimoire.AppImage',
      },
      'windows-x86_64': {
        url: 'https://example.com/Grimoire-setup.exe',
      },
    })
    expect(resolveStableDownloadTargets(latestPayload, releasesPayload)).toMatchObject({
      'darwin-aarch64': {
        url: 'https://example.com/Grimoire-aarch64.dmg',
      },
      'darwin-x86_64': {
        url: 'https://example.com/Grimoire-x64.dmg',
      },
      'linux-x86_64': {
        url: 'https://example.com/Grimoire.AppImage',
      },
      'windows-x86_64': {
        url: 'https://example.com/Grimoire-setup.exe',
      },
    })
  })
})

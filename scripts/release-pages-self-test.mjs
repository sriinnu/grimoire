import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildReleasePages, readJson } from './release-pages-core.mjs'

function writeReleaseFixture(releasesPath, sigPath, x64SigPath) {
  const winSigPath = sigPath.replace('Grimoire_aarch64.app.tar.gz.sig', 'Grimoire_x64-setup.exe.sig')
  const linuxSigPath = sigPath.replace('Grimoire_aarch64.app.tar.gz.sig', 'grimoire_amd64.AppImage.sig')
  writeFileSync(releasesPath, JSON.stringify([{
    assets: [
      {
        browser_download_url: 'https://example.com/Grimoire_aarch64.app.tar.gz',
        name: 'Grimoire_aarch64.app.tar.gz',
      },
      {
        browser_download_url: `file://${sigPath}`,
        name: 'Grimoire_aarch64.app.tar.gz.sig',
      },
      {
        browser_download_url: 'https://example.com/Grimoire_aarch64.dmg',
        name: 'Grimoire_aarch64.dmg',
      },
      {
        browser_download_url: 'https://example.com/Grimoire_x86_64.app.tar.gz',
        name: 'Grimoire_x86_64.app.tar.gz',
      },
      {
        browser_download_url: `file://${x64SigPath}`,
        name: 'Grimoire_x86_64.app.tar.gz.sig',
      },
      {
        browser_download_url: 'https://example.com/Grimoire_x86_64.dmg',
        name: 'Grimoire_x86_64.dmg',
      },
      {
        browser_download_url: 'https://example.com/Grimoire_x64-setup.exe',
        name: 'Grimoire_x64-setup.exe',
      },
      {
        browser_download_url: `file://${winSigPath}`,
        name: 'Grimoire_x64-setup.exe.sig',
      },
      {
        browser_download_url: 'https://example.com/grimoire_amd64.AppImage',
        name: 'grimoire_amd64.AppImage',
      },
      {
        browser_download_url: `file://${linuxSigPath}`,
        name: 'grimoire_amd64.AppImage.sig',
      },
    ],
    body: 'Stable release notes.',
    draft: false,
    html_url: 'https://github.com/sriinnu/grimoire/releases/tag/stable-v1.2.3',
    name: 'stable-v1.2.3',
    prerelease: false,
    published_at: '2026-06-01T00:00:00Z',
    tag_name: 'stable-v1.2.3',
  }]))
}

function assertReleasePageOutput(outputDir) {
  const manifest = readJson(join(outputDir, 'stable/latest.json'), null)
  if (manifest?.version !== '1.2.3') throw new Error('self-test did not normalize stable version')
  if (manifest.platforms['darwin-aarch64'].signature !== 'stable-signature') {
    throw new Error('self-test did not copy updater signature content')
  }
  if (manifest.platforms['darwin-x86_64'].signature !== 'stable-intel-signature') {
    throw new Error('self-test did not copy Intel updater signature content')
  }
  if (manifest.platforms['windows-x86_64'].signature !== 'stable-windows-signature') {
    throw new Error('self-test did not copy Windows updater signature content')
  }
  if (manifest.platforms['linux-x86_64'].signature !== 'stable-linux-signature') {
    throw new Error('self-test did not copy Linux updater signature content')
  }
  if (!existsSync(join(outputDir, 'stable/download/index.html'))) {
    throw new Error('self-test did not write stable download page')
  }

  const downloadPage = readFileSync(join(outputDir, 'stable/download/index.html'), 'utf8')
  if (!downloadPage.includes('macDownloadCount > 1') || !downloadPage.includes('Choose Apple Silicon or Intel Mac below.')) {
    throw new Error('self-test expected dual-architecture Mac downloads to require an explicit choice')
  }
  if (!downloadPage.includes('https://example.com/Grimoire_aarch64.dmg') || !downloadPage.includes('https://example.com/Grimoire_x86_64.dmg')) {
    throw new Error('self-test expected both macOS manual download links')
  }
  if (!downloadPage.includes('https://example.com/Grimoire_x64-setup.exe') || !downloadPage.includes('https://example.com/grimoire_amd64.AppImage')) {
    throw new Error('self-test expected Windows and Linux manual download links')
  }
  if (!existsSync(join(outputDir, 'alpha/download/index.html'))) {
    throw new Error('self-test did not write alpha fallback page')
  }
}

export async function runReleasePagesSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-release-pages-'))
  try {
    const sigPath = join(tempDir, 'Grimoire_aarch64.app.tar.gz.sig')
    const x64SigPath = join(tempDir, 'Grimoire_x86_64.app.tar.gz.sig')
    const winSigPath = join(tempDir, 'Grimoire_x64-setup.exe.sig')
    const linuxSigPath = join(tempDir, 'grimoire_amd64.AppImage.sig')
    const releasesPath = join(tempDir, 'releases.json')
    writeFileSync(sigPath, 'stable-signature\n')
    writeFileSync(x64SigPath, 'stable-intel-signature\n')
    writeFileSync(winSigPath, 'stable-windows-signature\n')
    writeFileSync(linuxSigPath, 'stable-linux-signature\n')
    writeReleaseFixture(releasesPath, sigPath, x64SigPath)

    const outputDir = join(tempDir, 'public')
    await buildReleasePages({ outputDir, releasesJson: releasesPath, token: '' })
    assertReleasePageOutput(outputDir)
    console.log('[release-pages] self-test passed')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

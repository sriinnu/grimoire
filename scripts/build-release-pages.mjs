#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const CHANNELS = ['stable', 'alpha']
const PLATFORM_ORDER = ['darwin-aarch64', 'darwin-x86_64']

function normalizeText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function readJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'))
  } catch {
    return fallback
  }
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function parseTimestamp(value) {
  const text = normalizeText(value)
  if (!text) return Number.NEGATIVE_INFINITY
  const timestamp = new Date(text).getTime()
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp
}

function normalizeVersion(release) {
  const tag = normalizeText(release.tag_name) ?? normalizeText(release.name) ?? ''
  return tag.replace(/^(?:stable-|alpha-)?v/i, '')
}

function releaseChannel(release) {
  const tag = normalizeText(release.tag_name) ?? ''
  if (release.prerelease === true || tag.startsWith('alpha-v')) return 'alpha'
  return 'stable'
}

function publicReleases(payload) {
  if (!Array.isArray(payload)) return []
  return payload
    .filter((release) => release && typeof release === 'object' && release.draft !== true)
    .sort((left, right) => (
      parseTimestamp(right.published_at ?? right.created_at)
      - parseTimestamp(left.published_at ?? left.created_at)
    ))
}

function classifyDarwinPlatform(assetName) {
  const normalized = assetName.toLowerCase()
  if (/(?:^|[-_.])(x64|x86_64|intel)(?:[-_.]|$)/.test(normalized)) {
    return 'darwin-x86_64'
  }
  if (/(?:^|[-_.])(aarch64|arm64|apple-silicon|silicon)(?:[-_.]|$)/.test(normalized)) {
    return 'darwin-aarch64'
  }
  return null
}

function normalizeReleaseAsset(asset) {
  const name = normalizeText(asset.name)
  const browserUrl = normalizeText(asset.browser_download_url)
  if (!name || !browserUrl) return null
  return {
    apiUrl: normalizeText(asset.url),
    browserUrl,
    name,
  }
}

function releaseAssets(release) {
  if (!Array.isArray(release.assets)) return []
  return release.assets
    .map(normalizeReleaseAsset)
    .filter((asset) => asset !== null)
}

function findLatestReleaseForChannel(releases, channel) {
  return releases.find((release) => releaseChannel(release) === channel) ?? null
}

async function fetchAssetText(asset, token) {
  if (asset.browserUrl.startsWith('file://')) {
    return readFileSync(fileURLToPath(asset.browserUrl), 'utf8').trim()
  }

  const url = asset.apiUrl ?? asset.browserUrl
  const headers = { Accept: 'application/octet-stream' }
  if (token) headers.Authorization = `Bearer ${token}`

  const response = await fetch(url, { headers, redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${asset.name}: ${response.status} ${response.statusText}`)
  }
  return (await response.text()).trim()
}

async function buildUpdaterManifest(release, token) {
  if (!release) return null

  const assets = releaseAssets(release)
  const signatureAssets = new Map(
    assets
      .filter((asset) => asset.name.endsWith('.sig'))
      .map((asset) => [asset.name.slice(0, -4), asset]),
  )
  const dmgAssets = new Map()
  for (const asset of assets.filter((candidate) => candidate.name.endsWith('.dmg'))) {
    const platform = classifyDarwinPlatform(asset.name)
    if (platform) dmgAssets.set(platform, asset)
  }

  const platforms = {}
  for (const asset of assets.filter((candidate) => candidate.name.endsWith('.app.tar.gz'))) {
    const platform = classifyDarwinPlatform(asset.name)
    const signatureAsset = signatureAssets.get(asset.name)
    if (!platform || !signatureAsset) continue

    const dmgAsset = dmgAssets.get(platform)
    platforms[platform] = {
      signature: await fetchAssetText(signatureAsset, token),
      url: asset.browserUrl,
    }
    if (dmgAsset) {
      platforms[platform].download_url = dmgAsset.browserUrl
      platforms[platform].dmg_url = dmgAsset.browserUrl
    }
  }

  if (Object.keys(platforms).length === 0) return null

  return {
    version: normalizeVersion(release),
    notes: normalizeText(release.body) ?? `Grimoire ${normalizeText(release.tag_name) ?? ''}`.trim(),
    pub_date: normalizeText(release.published_at) ?? new Date().toISOString(),
    platforms: Object.fromEntries(
      PLATFORM_ORDER
        .filter((platform) => platforms[platform])
        .map((platform) => [platform, platforms[platform]]),
    ),
  }
}

function manualDownloadLinks(manifest) {
  if (!manifest) return []
  return PLATFORM_ORDER
    .map((platform) => {
      const payload = manifest.platforms?.[platform]
      if (!payload) return null
      const label = platform === 'darwin-aarch64' ? 'macOS Apple Silicon' : 'macOS Intel'
      return {
        label,
        url: payload.download_url ?? payload.dmg_url ?? payload.url,
      }
    })
    .filter((link) => link?.url)
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

function pageShell(title, body) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light dark; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f6f3; color: #25231f; }
    body { margin: 0; min-height: 100vh; padding: 32px; }
    main { max-width: 760px; margin: 0 auto; }
    h1 { margin: 0 0 12px; font-size: 2rem; line-height: 1.1; }
    p { line-height: 1.55; }
    a { color: #155dff; font-weight: 650; }
    .card { border: 1px solid #d8dfdb; border-radius: 14px; padding: 20px; margin: 16px 0; background: rgba(255,255,255,0.72); }
    .downloads { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 14px; }
    .downloads a { border: 1px solid #b7c9c2; border-radius: 999px; padding: 9px 14px; text-decoration: none; }
    @media (prefers-color-scheme: dark) {
      :root { background: #171916; color: #f4efe7; }
      .card { background: rgba(33,35,31,0.88); border-color: #3d4b45; }
      a { color: #8db4ff; }
      .downloads a { border-color: #50635b; }
    }
  </style>
</head>
<body>
  <main>${body}
  </main>
</body>
</html>
`
}

function buildDownloadPage(channel, manifest) {
  const links = manualDownloadLinks(manifest)
  if (links.length === 0) {
    return pageShell('Grimoire Download Unavailable', `
    <h1>Grimoire ${channel} download unavailable</h1>
    <p>No verified ${channel} release assets are published yet.</p>
    <p><a href="../">View release history</a></p>`)
  }

  const first = links[0]
  return pageShell('Grimoire Download', `
    <h1>Grimoire ${channel} download</h1>
    <p id="download-message">Choose the signed macOS build for your machine.</p>
    <div class="downloads">
      ${links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join('\n      ')}
    </div>
    <script>
      const preferred = ${JSON.stringify(first)};
      const isMac = /Mac OS X|Macintosh/i.test(navigator.userAgent);
      if (isMac && preferred?.url) window.location.replace(preferred.url);
    </script>`)
}

function buildIndexPage(releases, manifests) {
  const cards = CHANNELS.map((channel) => {
    const release = findLatestReleaseForChannel(releases, channel)
    const manifest = manifests[channel]
    const links = manualDownloadLinks(manifest)
    const title = release ? normalizeText(release.name) ?? normalizeText(release.tag_name) : null
    return `
    <section class="card">
      <h2>${channel === 'stable' ? 'Stable' : 'Alpha'}</h2>
      <p>${title ? `Latest: ${escapeHtml(title)}` : 'No release published yet.'}</p>
      <div class="downloads">
        ${links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join('\n        ')}
        ${release?.html_url ? `<a href="${escapeHtml(release.html_url)}">GitHub release</a>` : ''}
      </div>
    </section>`
  }).join('\n')

  return pageShell('Grimoire Releases', `
    <h1>Grimoire releases</h1>
    <p>Release pages are generated from GitHub Release assets and signed updater metadata.</p>
    ${cards}`)
}

async function buildReleasePages(config) {
  const releases = publicReleases(readJson(config.releasesJson, []))
  const manifests = {}
  mkdirSync(config.outputDir, { recursive: true })

  for (const channel of CHANNELS) {
    const release = findLatestReleaseForChannel(releases, channel)
    const manifest = await buildUpdaterManifest(release, config.token)
    manifests[channel] = manifest

    const channelDir = join(config.outputDir, channel)
    mkdirSync(join(channelDir, 'download'), { recursive: true })
    if (manifest) writeJson(join(channelDir, 'latest.json'), manifest)
    writeFileSync(join(channelDir, 'download/index.html'), buildDownloadPage(channel, manifest))
  }

  writeFileSync(join(config.outputDir, 'index.html'), buildIndexPage(releases, manifests))
}

function parseArgs(argv) {
  const config = {
    outputDir: resolve(REPO_ROOT, '.release-pages/public'),
    releasesJson: null,
    selfTest: false,
    token: process.env.GH_TOKEN ?? '',
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const value = argv[index + 1]
    if (arg === '--self-test') config.selfTest = true
    else if (arg === '--output-dir' && value) {
      config.outputDir = resolve(value)
      index += 1
    } else if (arg === '--releases-json' && value) {
      config.releasesJson = resolve(value)
      index += 1
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`)
    }
  }

  if (!config.selfTest && !config.releasesJson) {
    throw new Error('--releases-json is required')
  }

  return config
}

async function runSelfTest() {
  const tempDir = mkdtempSync(join(tmpdir(), 'grimoire-release-pages-'))
  try {
    const sigPath = join(tempDir, 'Grimoire_aarch64.app.tar.gz.sig')
    writeFileSync(sigPath, 'stable-signature\n')
    const releasesPath = join(tempDir, 'releases.json')
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
      ],
      body: 'Stable release notes.',
      draft: false,
      html_url: 'https://github.com/sriinnu/grimoire/releases/tag/stable-v1.2.3',
      name: 'stable-v1.2.3',
      prerelease: false,
      published_at: '2026-06-01T00:00:00Z',
      tag_name: 'stable-v1.2.3',
    }]))

    const outputDir = join(tempDir, 'public')
    await buildReleasePages({ outputDir, releasesJson: releasesPath, token: '' })
    const manifest = readJson(join(outputDir, 'stable/latest.json'), null)
    if (manifest?.version !== '1.2.3') throw new Error('self-test did not normalize stable version')
    if (manifest.platforms['darwin-aarch64'].signature !== 'stable-signature') {
      throw new Error('self-test did not copy updater signature content')
    }
    if (!existsSync(join(outputDir, 'stable/download/index.html'))) {
      throw new Error('self-test did not write stable download page')
    }
    if (!existsSync(join(outputDir, 'alpha/download/index.html'))) {
      throw new Error('self-test did not write alpha fallback page')
    }
    console.log('[release-pages] self-test passed')
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}

try {
  const config = parseArgs(process.argv.slice(2))
  if (config.selfTest) await runSelfTest()
  else await buildReleasePages(config)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[release-pages] ${message}`)
  process.exitCode = 1
}

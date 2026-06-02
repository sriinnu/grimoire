import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const CHANNELS = ['stable', 'alpha']
const PLATFORM_ORDER = ['darwin-aarch64', 'darwin-x86_64']

function normalizeText(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export function readJson(path, fallback) {
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
  if (/(?:^|[-_.])(x64|x86_64|intel)(?:[-_.]|$)/u.test(normalized)) return 'darwin-x86_64'
  if (/(?:^|[-_.])(aarch64|arm64|apple-silicon|silicon)(?:[-_.]|$)/u.test(normalized)) return 'darwin-aarch64'
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
  return release.assets.map(normalizeReleaseAsset).filter((asset) => asset !== null)
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
      return { label, url: payload.download_url ?? payload.dmg_url ?? payload.url }
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

  const macLinkCount = links.filter((link) => link.label.startsWith('macOS ')).length
  const onlyMacLink = macLinkCount === 1 ? links.find((link) => link.label.startsWith('macOS ')) : null
  return pageShell('Grimoire Download', `
    <h1>Grimoire ${channel} download</h1>
    <p id="download-message">Choose the signed macOS build for your machine.</p>
    <div class="downloads">
      ${links.map((link) => `<a href="${escapeHtml(link.url)}">${escapeHtml(link.label)}</a>`).join('\n      ')}
    </div>
    <script>
      const macDownloadCount = ${JSON.stringify(macLinkCount)};
      const onlyMacDownload = ${JSON.stringify(onlyMacLink)};
      const isMac = /Mac OS X|Macintosh/i.test(navigator.userAgent);
      if (isMac && macDownloadCount > 1) {
        const message = document.getElementById('download-message');
        if (message) message.textContent = 'Choose Apple Silicon or Intel Mac below.';
      } else if (isMac && onlyMacDownload?.url) {
        window.location.replace(onlyMacDownload.url);
      }
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

export async function buildReleasePages(config) {
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

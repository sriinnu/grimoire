/** Local import only. The CLI repeats strict validation and owns pairing authority. */
const MAX_IMAGE_BYTES = 16 * 1024 * 1024
const MAX_PIXELS = 16 * 1024 * 1024
const KEYS = ['v', 'app', 'challengeId', 'origin', 'expiresAt', 'ca']

export function validateGrimoireInvitation(raw: string, origin: string, now = Date.now()): string {
  try {
    if (!raw || raw.length > 4096 || /[^\x21-\x7e]/.test(raw)) throw new Error()
    const url = new URL(raw)
    const expected = new URL(origin)
    if (!['http:', 'https:'].includes(expected.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(expected.hostname)
      || expected.origin !== origin || url.protocol !== 'chitragupta:' || url.host !== 'app-pair'
      || url.pathname || url.username || url.password) throw new Error()
    for (const key of url.searchParams.keys()) {
      if (!KEYS.includes(key) || url.searchParams.getAll(key).length !== 1) throw new Error()
    }
    const expiry = url.searchParams.get('expiresAt') ?? ''
    if (url.searchParams.get('v') !== '1' || url.searchParams.get('app') !== 'grimoire'
      || url.searchParams.get('origin') !== origin
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(url.searchParams.get('challengeId') ?? '')
      || !/^[1-9][0-9]{0,15}$/.test(expiry) || !Number.isSafeInteger(Number(expiry))
      || Number(expiry) <= now || !/^#token=[A-Za-z0-9_-]{43}$/.test(url.hash)
      || (url.searchParams.has('ca') && !/^[A-Fa-f0-9:]{32,191}$/.test(url.searchParams.get('ca') ?? ''))) throw new Error()
    return raw
  } catch {
    throw new Error('Use a fresh grimoire invitation from this local Chitragupta Hub. Check the app, server and expiry.')
  }
}

/** Used by the image importer and exercised with a real QR fixture. */
export async function decodeInvitationPixels(data: Uint8ClampedArray, width: number, height: number): Promise<string> {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1
    || width * height > MAX_PIXELS || data.length !== width * height * 4) throw new Error('Choose a smaller QR image (up to 16 million pixels).')
  const { default: jsQR } = await import('jsqr')
  const decoded = jsQR(data, width, height)
  if (!decoded || decoded.data.length > 4096) throw new Error('No supported invitation QR was found. Paste the invitation link instead.')
  return decoded.data
}

/** File bytes remain in this webview; no upload, external URLs or camera access. */
export async function readInvitationImage(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES) {
    throw new Error('Choose a PNG, JPEG or WebP QR image up to 16 MB.')
  }
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => header[index] === byte)
  const jpeg = header[0] === 255 && header[1] === 216 && header[2] === 255
  const webp = String.fromCharCode(...header.slice(0, 4)) === 'RIFF' && String.fromCharCode(...header.slice(8, 12)) === 'WEBP'
  if (!((file.type === 'image/png' && png) || (file.type === 'image/jpeg' && jpeg) || (file.type === 'image/webp' && webp))) {
    throw new Error('This file is not a supported PNG, JPEG or WebP image.')
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('This QR image could not be opened. Paste the invitation link instead.'))
      img.src = url
    })
    if (!img.naturalWidth || !img.naturalHeight || img.naturalWidth * img.naturalHeight > MAX_PIXELS) {
      throw new Error('Choose a smaller QR image (up to 16 million pixels).')
    }
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image import is unavailable. Paste the invitation link instead.')
    context.drawImage(img, 0, 0)
    return await decodeInvitationPixels(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)
  } finally {
    URL.revokeObjectURL(url)
  }
}

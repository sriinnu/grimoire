import { describe, expect, it } from 'vitest'
import fixture from './__fixtures__/invitation-qr.json'
import { decodeInvitationPixels, readInvitationImage, validateGrimoireInvitation } from './chitraguptaInvitation'

const origin = 'http://127.0.0.1:3141'
describe('local pairing invitation import', () => {
  it('decodes a real synthetic QR then checks app, origin and expiry', async () => {
    const scale = 4, border = 4, width = (fixture.rows.length + border * 2) * scale
    const pixels = new Uint8ClampedArray(width * width * 4).fill(255)
    fixture.rows.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell !== '1') return
      for (let dy = 0; dy < scale; dy++) for (let dx = 0; dx < scale; dx++) {
        const offset = (((y + border) * scale + dy) * width + (x + border) * scale + dx) * 4
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 0
      }
    }))
    const decoded = await decodeInvitationPixels(pixels, width, width)
    expect(decoded).toBe(fixture.payload)
    expect(validateGrimoireInvitation(decoded, origin, 1)).toBe(fixture.payload)
    expect(() => validateGrimoireInvitation(decoded, origin, 4102444800000)).toThrow('fresh')
    expect(() => validateGrimoireInvitation(decoded, 'http://localhost:3141', 1)).toThrow('server')
  })
  it.each([
    fixture.payload.replace('app=grimoire', 'app=other'),
    fixture.payload.replace('v=1', 'v=2'),
    fixture.payload.replace('app=grimoire', 'app=grimoire&app=grimoire'),
    fixture.payload.replace('v=1', 'v=1&extra=unknown'),
    fixture.payload + 'x'.repeat(4096),
  ])('rejects malformed or mismatched invitation without reflecting it', (input) => {
    expect(() => validateGrimoireInvitation(input, origin, 1)).toThrow(/^Use a fresh grimoire invitation/)
  })
  it('rejects SVG and oversized files before image creation', async () => {
    await expect(readInvitationImage(new File(['<svg/>'], 'qr.svg', { type: 'image/svg+xml' }))).rejects.toThrow('PNG')
    await expect(readInvitationImage(new File([new Uint8Array(16 * 1024 * 1024 + 1)], 'qr.png', { type: 'image/png' }))).rejects.toThrow('16 MB')
    const disguised = { type: 'image/png', size: 6, slice: () => ({ arrayBuffer: async () => new TextEncoder().encode('<svg/>').buffer }) } as unknown as File
    await expect(readInvitationImage(disguised)).rejects.toThrow('not a supported')
    await expect(decodeInvitationPixels(new Uint8ClampedArray(4), 8192, 8192)).rejects.toThrow('16 million')
  })
})

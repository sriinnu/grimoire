import { readFileSync } from 'node:fs'
import { RUNTIME_STYLE_NONCE_SOURCE } from '../lib/runtimeStyleNonce'

describe('Tauri Content Security Policy', () => {
  it('allows nonce-tagged runtime style and bootstrap script elements', () => {
    const config = JSON.parse(readFileSync(`${process.cwd()}/src-tauri/tauri.conf.json`, 'utf8'))
    const csp = config.app.security.csp as Record<string, string>
    const indexHtml = readFileSync(`${process.cwd()}/index.html`, 'utf8')

    expect(csp['script-src']).toContain(RUNTIME_STYLE_NONCE_SOURCE)
    expect(csp['style-src']).toContain("'unsafe-inline'")
    expect(csp['style-src-elem']).toContain(RUNTIME_STYLE_NONCE_SOURCE)
    expect(csp['style-src-elem']).not.toContain('https://fonts.googleapis.com')
    expect(csp['style-src-attr']).toBe("'unsafe-inline'")
    expect(csp['font-src']).toBe("'self' data:")
    expect(csp['connect-src']).not.toMatch(/\shttps:\s*$/)
    expect(csp['connect-src']).toContain('https://sriinnu.github.io')
    expect(csp['connect-src']).toContain('https://*.sentry.io')
    expect(csp['img-src']).toBe("'self' asset: http://asset.localhost data: blob:")
    expect(csp['media-src']).toBe("'self' data: blob:")
    expect(indexHtml).toContain('<style nonce="grimoire-runtime-style">')
    expect(indexHtml).toContain('<script nonce="grimoire-runtime-style">')
  })
})

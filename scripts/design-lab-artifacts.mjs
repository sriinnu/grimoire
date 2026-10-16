// Dev-only: capture Design Lab section screenshots into design/lab/.
// Run: node scripts/design-lab-artifacts.mjs   (requires `pnpm dev` on :5202)
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const BASE = process.env.DESIGN_LAB_URL ?? 'http://localhost:5202/#design-lab'
const OUT = new URL('../design/lab/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch({
  executablePath:
    '/Users/srinivaspendela/Library/Caches/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-mac-arm64/chrome-headless-shell',
})
const page = await browser.newPage({ viewport: { width: 1680, height: 1000 }, deviceScaleFactor: 2 })
await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.evaluate(() => {
  const topbar = document.querySelector('.dl-topbar')
  if (topbar) topbar.style.display = 'none'
})

const sections = [
  ['dl-rail', 'rail-both-modes'],
  ['dl-sidebar', 'sidebar-both-modes'],
  ['dl-chitragupta', 'chitragupta-both-modes'],
  ['dl-fullapp', 'fullapp-all'],
  ['dl-mobile', 'iphone-both-modes'],
]

for (const [id, name] of sections) {
  const el = page.locator(`#${id}`)
  await el.scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await el.screenshot({ path: `${OUT}${name}.png` })
  console.log(`saved ${name}.png`)
}

// Full-app windows, individually, at full window fidelity
const wins = page.locator('#dl-fullapp .dl-frame')
const winNames = ['fullapp-home-light', 'fullapp-editor-dark', 'fullapp-ask-dark']
for (let i = 0; i < winNames.length; i++) {
  await wins.nth(i).scrollIntoViewIfNeeded()
  await page.waitForTimeout(350)
  await wins.nth(i).screenshot({ path: `${OUT}${winNames[i]}.png` })
  console.log(`saved ${winNames[i]}.png`)
}

// iPhone-scale single-mode shots of the mobile shell
const mob = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 })
await mob.goto(BASE, { waitUntil: 'networkidle' })
await mob.waitForTimeout(1200)
await mob.locator('#dl-mobile').scrollIntoViewIfNeeded()
await mob.evaluate(() => {
  const topbar = document.querySelector('.dl-topbar')
  if (topbar) topbar.style.display = 'none'
})
await mob.waitForTimeout(350)
await mob.locator('#dl-mobile .dl-phone >> nth=0').screenshot({ path: `${OUT}iphone-pearl.png` })
await mob.locator('#dl-mobile .dl-phone >> nth=1').screenshot({ path: `${OUT}iphone-nocturne.png` })
console.log('saved iphone-pearl.png + iphone-nocturne.png')

await browser.close()

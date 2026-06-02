import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const PRODUCT_MOTION_FILES = [
  'src/motion.css',
  'src/motion-memory.css',
  'src/motion-agent-council.css',
  'src/theme-flagship-shared.css',
  'src/graph-animations.css',
  'src/sidebar-artwork-themes.css',
  'src/sidebar-artwork-polish.css',
  'src/sidebar-pouch-effect.css',
  'src/sidebar-glyph-polish.css',
  'src/sidebar-glyph-refinement.css',
  'src/components/folder-tree/FolderGlyph.css',
  'src/components/dashboard/VaultDashboard.css',
] as const

const REDUCED_MOTION_INFORMATION_FILES = [
  ...PRODUCT_MOTION_FILES,
  'src/theme-editor-navigator.css',
] as const

const INFINITE_MOTION_FILES = [
  'src/App.css',
  'src/ai-markdown.css',
  'src/components/EditorLoadingState.css',
] as const

const COMPOSITOR_SAFE_PROPERTIES = new Set([
  'opacity',
  'stroke-dashoffset',
  'transform',
  'translate',
])

type KeyframeBlock = {
  body: string
  file: string
  name: string
}

function readCss(file: string): string {
  return readFileSync(`${process.cwd()}/${file}`, 'utf8')
}

function matchingBraceIndex(source: string, openIndex: number): number {
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index]
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    if (depth === 0) return index
  }
  throw new Error(`Unclosed keyframe block near ${openIndex}`)
}

function extractKeyframes(file: string, css: string): KeyframeBlock[] {
  const blocks: KeyframeBlock[] = []
  const keyframePattern = /@keyframes\s+([^{\s]+)\s*\{/gu
  for (const match of css.matchAll(keyframePattern)) {
    const openIndex = match.index + match[0].length - 1
    const closeIndex = matchingBraceIndex(css, openIndex)
    blocks.push({
      body: css.slice(openIndex + 1, closeIndex),
      file,
      name: match[1],
    })
  }
  return blocks
}

function extractReducedMotionBlocks(file: string, css: string): KeyframeBlock[] {
  const blocks: KeyframeBlock[] = []
  const mediaPattern = /@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/gu
  for (const match of css.matchAll(mediaPattern)) {
    const openIndex = match.index + match[0].length - 1
    const closeIndex = matchingBraceIndex(css, openIndex)
    blocks.push({
      body: css.slice(openIndex + 1, closeIndex),
      file,
      name: 'prefers-reduced-motion',
    })
  }
  return blocks
}

function declarationNames(body: string): string[] {
  return [...body.matchAll(/^\s*([-\w]+)\s*:/gmu)].map((match) => match[1])
}

function reducedMotionInformationProblems(file: string, css: string): string[] {
  return extractReducedMotionBlocks(file, css).flatMap((block) => {
    const problems: string[] = []
    if (/\bdisplay\s*:\s*none\b/u.test(block.body)) problems.push('display:none')
    if (/\bvisibility\s*:\s*hidden\b/u.test(block.body)) problems.push('visibility:hidden')
    if (/\bopacity\s*:\s*0(?:\s*(?:;|\}|\n|$))/u.test(block.body)) problems.push('opacity:0')
    return problems.map((problem) => `${block.file} ${block.name}: ${problem}`)
  })
}

function selectorBeforeDeclaration(css: string, declarationIndex: number): string {
  const blockStart = css.lastIndexOf('{', declarationIndex)
  const previousBlockEnd = css.lastIndexOf('}', blockStart)
  return css.slice(previousBlockEnd + 1, blockStart).trim()
}

function isAllowedBusyLoop(file: string, selector: string): boolean {
  if (file === 'src/App.css') return selector === '.update-download-spinner'
  if (file === 'src/ai-markdown.css') return selector === '.typing-dot'
  return false
}

describe('product motion performance CSS', () => {
  it('keeps product keyframes limited to compositor-safe properties', () => {
    const unsafe = PRODUCT_MOTION_FILES.flatMap((file) => {
      return extractKeyframes(file, readCss(file)).flatMap((block) => {
        return declarationNames(block.body)
          .filter((property) => !COMPOSITOR_SAFE_PROPERTIES.has(property))
          .map((property) => `${block.file} @keyframes ${block.name}: ${property}`)
      })
    })

    expect(unsafe).toEqual([])
  })

  it('keeps product motion finite and reduced-motion aware', () => {
    const problems = PRODUCT_MOTION_FILES.flatMap((file) => {
      const css = readCss(file)
      const fileProblems: string[] = []
      if (/\banimation:[^;{}]*\binfinite\b/u.test(css)) {
        fileProblems.push(`${file}: infinite animation`)
      }
      if (css.includes('animation:') && !css.includes('prefers-reduced-motion')) {
        fileProblems.push(`${file}: missing reduced-motion gate`)
      }
      return fileProblems
    })

    expect(problems).toEqual([])
  })

  it('keeps reduced-motion fallbacks informational instead of hiding cues', () => {
    const problems = REDUCED_MOTION_INFORMATION_FILES.flatMap((file) => (
      reducedMotionInformationProblems(file, readCss(file))
    ))

    expect(problems).toEqual([])
  })

  it('allows infinite animation only for explicit busy indicators with reduced-motion fallbacks', () => {
    const problems = INFINITE_MOTION_FILES.flatMap((file) => {
      const css = readCss(file)
      const fileProblems = [...css.matchAll(/\banimation\s*:[^;{}]*\binfinite\b/gu)].flatMap((match) => {
        const selector = selectorBeforeDeclaration(css, match.index)
        return isAllowedBusyLoop(file, selector) ? [] : [`${file}: ${selector}`]
      })

      if (fileProblems.length === 0 && css.includes('infinite') && !css.includes('prefers-reduced-motion')) {
        fileProblems.push(`${file}: infinite motion without reduced-motion fallback`)
      }

      return fileProblems
    })

    expect(problems).toEqual([])
    expect(readCss('src/components/EditorLoadingState.css')).not.toContain('infinite')
    expect(readCss('src/components/EditorLoadingState.css')).toContain('contain: layout paint style')
    expect(readCss('src/components/GrimoireRefreshAnimation.css')).not.toContain('infinite')
    expect(readCss('src/components/GrimoireRefreshAnimation.css')).toContain('contain: layout paint style')
  })

  it('keeps context menus finite and compositor-scoped', () => {
    const css = readCss('src/motion.css')

    expect(css).toContain('.grimoire-context-menu-surface')
    expect(css).toContain('animation: grimoire-context-menu-arrive var(--motion-duration-fast)')
    expect(css).toContain('contain: layout paint style')
    expect(css).toContain('will-change: opacity, transform')
    expect(css).toContain('@keyframes grimoire-context-menu-arrive')
  })
})

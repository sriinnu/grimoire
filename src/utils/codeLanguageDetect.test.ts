import { describe, expect, it } from 'vitest'
import {
  applyDetectedCodeLanguagesToEditor,
  detectCodeLanguage,
  stripInjectedCodeLanguages,
  type CodeLanguageDetectionTarget,
} from './codeLanguageDetect'

describe('detectCodeLanguage', () => {
  it('detects JSON structurally', () => {
    expect(detectCodeLanguage('{ "name": "grimoire", "private": true }')).toBe('json')
  })

  it('detects YAML from key-value lines', () => {
    expect(detectCodeLanguage('type: Project\nstatus: Active\nbelongs_to: "[[q1]]"')).toBe('yaml')
  })

  it('detects Rust', () => {
    expect(detectCodeLanguage('pub fn scan(vault: &Path) -> Vec<Entry> {\n    let mut out = Vec::new();\n    walkdir::WalkDir::new(vault)\n}')).toBe('rust')
  })

  it('detects Python', () => {
    expect(detectCodeLanguage('def build(entries):\n    import json\n    print(len(entries))')).toBe('python')
  })

  it('detects TypeScript over JavaScript when types appear', () => {
    expect(detectCodeLanguage('export interface Entry {\n  title: string\n}\nexport const load = (path: string): Entry => ({ title: path })')).toBe('typescript')
  })

  it('detects shell commands', () => {
    expect(detectCodeLanguage('brew install ripgrep\ncd ~/vault && git status\necho $HOME')).toBe('shellscript')
  })

  it('answers null for prose and trivial snippets', () => {
    expect(detectCodeLanguage('This is just a sentence about code.')).toBeNull()
    expect(detectCodeLanguage('x = 1')).toBeNull()
  })
})

describe('display-only detection pass', () => {
  const PYTHON = 'def build(entries):\n    import json\n    print(len(entries))'

  interface TestBlock {
    id?: string
    type: string
    props: { language?: string } & Record<string, unknown>
    content: unknown
    children: TestBlock[]
  }

  const codeBlock = (id: string, text: string, language = 'text'): TestBlock => ({
    id,
    type: 'codeBlock',
    props: { language },
    content: [{ type: 'text', text }],
    children: [],
  })

  function makeEditor(blocks: TestBlock[]) {
    const editor = {
      document: blocks,
      updateBlock(blockId: string, update: { props: { language: string } }) {
        const visit = (list: TestBlock[]) => {
          for (const block of list) {
            if (block.id === blockId) block.props = { ...block.props, ...update.props }
            if (block.children.length) visit(block.children)
          }
        }
        visit(editor.document)
      },
    }
    return editor as typeof editor & CodeLanguageDetectionTarget
  }

  it('injects detected languages into the live document and strips them back out', () => {
    const editor = makeEditor([
      codeBlock('py', PYTHON),
      codeBlock('labeled', PYTHON, 'rust'),
      { type: 'paragraph', props: {}, content: [{ type: 'text', text: 'hello' }], children: [] },
    ])

    applyDetectedCodeLanguagesToEditor(editor)

    expect(editor.document[0].props.language).toBe('python')
    expect(editor.document[1].props.language).toBe('rust')

    const stripped = stripInjectedCodeLanguages(editor.document)
    expect(stripped[0].props.language).toBe('')
    expect(stripped[1].props.language).toBe('rust')
    expect(stripped[2]).toBe(editor.document[2])
  })

  it('keeps a language the user picked over the detected one', () => {
    const editor = makeEditor([codeBlock('py', PYTHON)])
    applyDetectedCodeLanguagesToEditor(editor)
    expect(editor.document[0].props.language).toBe('python')

    // user overrides via the language picker
    editor.updateBlock('py', { props: { language: 'rust' } })

    const stripped = stripInjectedCodeLanguages(editor.document)
    expect(stripped[0].props.language).toBe('rust')
    // once dropped from tracking, later strips leave it alone too
    expect(stripInjectedCodeLanguages(editor.document)[0].props.language).toBe('rust')
  })

  it('recurses into children and clears tracking on each apply', () => {
    const child = codeBlock('json', '{ "name": "grimoire", "count": 1 }')
    const editor = makeEditor([
      { type: 'paragraph', props: {}, content: [], children: [child, codeBlock('mystery', 'mystery text here??')] },
    ])

    applyDetectedCodeLanguagesToEditor(editor)
    expect(editor.document[0].children[0].props.language).toBe('json')
    expect(editor.document[0].children[1].props.language).toBe('text')
    expect(stripInjectedCodeLanguages(editor.document)[0].children[0].props.language).toBe('')

    // a fresh apply on another document forgets earlier injections
    const nextEditor = makeEditor([codeBlock('other', PYTHON)])
    applyDetectedCodeLanguagesToEditor(nextEditor)
    const strippedOld = stripInjectedCodeLanguages(editor.document)
    expect(strippedOld[0].children[0].props.language).toBe('json')
  })
})

import { describe, expect, it } from 'vitest'
import { detectCodeLanguage } from './codeLanguageDetection'

describe('detectCodeLanguage', () => {
  it('detects common application languages', () => {
    expect(detectCodeLanguage('def greet(name):\n    return f"hi {name}"')).toBe('python')
    expect(detectCodeLanguage('interface User {\n  name: string\n}\nconst user: User = { name: "Sri" }')).toBe('typescript')
    expect(detectCodeLanguage('package main\n\nfunc main() {\n  fmt.Println("hi")\n}')).toBe('go')
    expect(detectCodeLanguage('struct ContentView: View {\n  var body: some View { Text("hi") }\n}')).toBe('swift')
  })

  it('detects data and diagram fences', () => {
    expect(detectCodeLanguage('{"name":"Grimoire","enabled":true}')).toBe('json')
    expect(detectCodeLanguage('title: Grimoire\nstatus: Active\nowner: Sri')).toBe('yaml')
    expect(detectCodeLanguage('flowchart TD\n  A --> B')).toBe('mermaid')
    expect(detectCodeLanguage('classDiagram-v2\n  Note --> Spelllink')).toBe('mermaid')
  })

  it('stays quiet for tiny or ambiguous snippets', () => {
    expect(detectCodeLanguage('x = 1')).toBeNull()
    expect(detectCodeLanguage('just a paragraph with words')).toBeNull()
  })
})

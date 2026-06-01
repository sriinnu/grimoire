import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import ts from 'typescript'

const PROJECT_ROOT = resolve(__dirname, '../..')

/** Returns runtime-only static import specifiers from a TypeScript/TSX file. */
export function runtimeStaticImports(relativePath: string): string[] {
  const sourceFile = parseSourceFile(relativePath)
  const imports: string[] = []

  sourceFile.forEachChild((node) => {
    if (!ts.isImportDeclaration(node)) return
    if (node.importClause?.isTypeOnly) return
    if (!ts.isStringLiteral(node.moduleSpecifier)) return
    imports.push(node.moduleSpecifier.text)
  })

  return imports
}

/** Returns literal dynamic import specifiers from a TypeScript/TSX file. */
export function runtimeDynamicImports(relativePath: string): string[] {
  const sourceFile = parseSourceFile(relativePath)
  const imports: string[] = []

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node)
      && node.expression.kind === ts.SyntaxKind.ImportKeyword
      && ts.isStringLiteral(node.arguments[0])
    ) {
      imports.push(node.arguments[0].text)
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return imports
}

/** Walks local runtime static imports from an entry file. */
export function staticImportGraph(entryPath: string): string[] {
  const visited = new Set<string>()

  function walk(relativePath: string): void {
    if (visited.has(relativePath)) return
    visited.add(relativePath)

    for (const specifier of runtimeStaticImports(relativePath)) {
      const resolved = resolveRelativeModule(relativePath, specifier)
      if (resolved) walk(resolved)
    }
  }

  walk(entryPath)
  return [...visited].sort()
}

/** Returns all runtime static import specifiers reachable from an entry file. */
export function staticImportGraphSpecifiers(entryPath: string): string[] {
  return staticImportGraph(entryPath).flatMap(runtimeStaticImports)
}

function parseSourceFile(relativePath: string): ts.SourceFile {
  const absolutePath = resolve(PROJECT_ROOT, relativePath)
  const sourceText = readFileSync(absolutePath, 'utf8')
  return ts.createSourceFile(relativePath, sourceText, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX)
}

function resolveRelativeModule(fromRelativePath: string, specifier: string): string | null {
  if (!specifier.startsWith('.') || specifier.endsWith('.css')) return null
  const fromAbsolutePath = resolve(PROJECT_ROOT, fromRelativePath)
  const candidateBase = resolve(dirname(fromAbsolutePath), specifier)
  for (const candidate of [
    candidateBase,
    `${candidateBase}.ts`,
    `${candidateBase}.tsx`,
    `${candidateBase}/index.ts`,
    `${candidateBase}/index.tsx`,
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return relative(PROJECT_ROOT, candidate).replace(/\\/g, '/')
    }
  }
  return null
}

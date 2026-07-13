import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const appDirectory = join(root, 'src', 'app')
const appModules = (await readdir(appDirectory, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && ['.ts', '.tsx'].includes(extname(entry.name)))
  .map((entry) => join(appDirectory, entry.name))
const files = [join(root, 'src', 'App.tsx'), join(root, 'src', 'AppRuntime.tsx'), ...appModules]
const limit = 400
const violations = []

for (const file of files) {
  const source = await readFile(file, 'utf8')
  const lineCount = source === '' ? 0 : source.replace(/\r\n/g, '\n').replace(/\n$/, '').split('\n').length
  if (lineCount > limit) violations.push(`${relative(root, file)}: ${lineCount} lines`)
}

if (violations.length > 0) {
  console.error(`App modules must stay at or below ${limit} lines:\n${violations.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`App module LOC check passed (${files.length} files, max ${limit})`)
}

#!/usr/bin/env node
import { existsSync, lstatSync, readdirSync, rmSync, statSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const TAURI_TARGET_ROOT = resolve(REPO_ROOT, 'src-tauri/target')
const TARGET_PATH = resolve(TAURI_TARGET_ROOT, 'debug')

const dryRun = process.argv.includes('--dry-run')

function assertWithinTargetRoot(pathToDelete) {
  const relativePath = relative(TAURI_TARGET_ROOT, pathToDelete)
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error(`Refusing to remove non-target path: ${pathToDelete}`)
  }
}

function getFolderSize(path) {
  if (!existsSync(path)) return 0
  const stats = statSync(path)
  if (!stats.isDirectory()) return stats.size

  let total = 0
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const childPath = resolve(path, entry.name)
    if (entry.isDirectory()) {
      total += getFolderSize(childPath)
      continue
    }

    if (entry.isSymbolicLink() || entry.isFile() || entry.isFIFO()) {
      total += lstatSync(childPath).size
    }
  }

  return total
}

function humanBytes(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let value = bytes
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(2)} ${units[index]}`
}

function removePath(path) {
  assertWithinTargetRoot(path)

  if (!existsSync(path)) {
    console.log(`skip: ${relative(REPO_ROOT, path)} (missing)`)
    return
  }

  if (dryRun) {
    console.log(`dry-run: would remove ${relative(REPO_ROOT, path)}`)
    return
  }

  rmSync(path, { recursive: true, force: true })
  console.log(`removed: ${relative(REPO_ROOT, path)}`)
}

const beforeBytes = getFolderSize(TARGET_PATH)
console.log(`tauri debug target size: ${humanBytes(beforeBytes)} (${beforeBytes} B)`)

removePath(TARGET_PATH)

const afterBytes = getFolderSize(TARGET_PATH)
if (!dryRun) {
  console.log(`freed: ${humanBytes(beforeBytes - afterBytes)} (${beforeBytes - afterBytes} B)`)
} else {
  console.log('dry-run: no files were removed')
}

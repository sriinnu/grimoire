#!/usr/bin/env node
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const TAURI_TARGET_ROOT = resolve(REPO_ROOT, 'src-tauri/target')

function assertGeneratedTargetPath(path) {
  const relativePath = relative(TAURI_TARGET_ROOT, path)
  if (relativePath.startsWith('..') || relativePath === '') {
    throw new Error(`Refusing to remove non-target path: ${path}`)
  }
}

function removeGeneratedPath(path) {
  const resolvedPath = resolve(path)
  assertGeneratedTargetPath(resolvedPath)

  if (!existsSync(resolvedPath)) {
    console.log(`skip ${relative(REPO_ROOT, resolvedPath)} (missing)`)
    return
  }

  rmSync(resolvedPath, { recursive: true, force: true })
  console.log(`removed ${relative(REPO_ROOT, resolvedPath)}`)
}

function bundleDirectories() {
  const directories = [resolve(TAURI_TARGET_ROOT, 'release/bundle')]
  if (!existsSync(TAURI_TARGET_ROOT)) return directories

  for (const entry of readdirSync(TAURI_TARGET_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    directories.push(resolve(TAURI_TARGET_ROOT, entry.name, 'release/bundle'))
  }

  return [...new Set(directories)]
}

for (const directory of bundleDirectories()) {
  removeGeneratedPath(directory)
}

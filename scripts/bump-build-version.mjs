#!/usr/bin/env node
// Bumps the Grimoire version everywhere it lives: package.json, tauri.conf.json,
// Cargo.toml, and the grimoire entry in Cargo.lock. Runs as a CLI
// (`pnpm version:build|minor|major`) and exports the pieces so the release
// script can drive the same bump without shelling out.
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const PACKAGE_JSON = resolve(REPO_ROOT, 'package.json')
const TAURI_CONFIG = resolve(REPO_ROOT, 'src-tauri/tauri.conf.json')
const CARGO_TOML = resolve(REPO_ROOT, 'src-tauri/Cargo.toml')
const CARGO_LOCK = resolve(REPO_ROOT, 'src-tauri/Cargo.lock')

/** Every file that carries the version; the release commit stages exactly these. */
export const VERSION_FILES = [
  'package.json',
  'src-tauri/tauri.conf.json',
  'src-tauri/Cargo.toml',
  'src-tauri/Cargo.lock',
]

export function parseVersion(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (!match) throw new Error(`Expected x.y.z version, found ${version}`)
  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  }
}

function formatVersion({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`
}

export function nextVersion(current, mode) {
  const version = parseVersion(current)
  if (mode === 'major') return formatVersion({ major: version.major + 1, minor: 0, patch: 1 })
  if (mode === 'minor') return formatVersion({ major: version.major, minor: version.minor + 1, patch: 1 })
  return formatVersion({ ...version, patch: version.patch + 1 })
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

function writeJson(path, data) {
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`)
}

export function readCurrentVersion() {
  return String(readJson(PACKAGE_JSON).version ?? '')
}

function updateCargoToml(version) {
  const cargoToml = readFileSync(CARGO_TOML, 'utf8')
  const updated = cargoToml.replace(
    /^version = "\d+\.\d+\.\d+"/m,
    `version = "${version}"`,
  )
  if (updated === cargoToml) throw new Error(`Could not update package version in ${CARGO_TOML}`)
  writeFileSync(CARGO_TOML, updated)
}

/** Rewrites only the grimoire package block in Cargo.lock; dependencies stay untouched. */
export function updateCargoLockText(lockText, version) {
  const pattern = /(\[\[package\]\]\nname = "grimoire"\nversion = ")(\d+\.\d+\.\d+)(")/
  if (!pattern.test(lockText)) throw new Error('Could not find the grimoire package in Cargo.lock')
  return lockText.replace(pattern, `$1${version}$3`)
}

function updateCargoLock(version) {
  writeFileSync(CARGO_LOCK, updateCargoLockText(readFileSync(CARGO_LOCK, 'utf8'), version))
}

/** Writes one version into every file that carries it. */
export function applyVersion(version) {
  parseVersion(version)
  const packageJson = readJson(PACKAGE_JSON)
  const tauriConfig = readJson(TAURI_CONFIG)
  packageJson.version = version
  tauriConfig.version = version
  writeJson(PACKAGE_JSON, packageJson)
  writeJson(TAURI_CONFIG, tauriConfig)
  updateCargoToml(version)
  updateCargoLock(version)
}

/** Bumps by mode and returns { from, to }. */
export function bumpVersion(mode = 'patch') {
  const from = readCurrentVersion()
  const to = nextVersion(from, mode)
  applyVersion(to)
  return { from, to }
}

export function modeFromArgs(args) {
  if (args.includes('--major')) return 'major'
  if (args.includes('--minor')) return 'minor'
  return 'patch'
}

const invokedDirectly = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedDirectly) {
  const { from, to } = bumpVersion(modeFromArgs(process.argv.slice(2)))
  console.log(`Bumped Grimoire build version: ${from} -> ${to}`)
}

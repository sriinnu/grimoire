#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const PACKAGE_JSON = resolve(REPO_ROOT, 'package.json')
const TAURI_CONFIG = resolve(REPO_ROOT, 'src-tauri/tauri.conf.json')
const CARGO_TOML = resolve(REPO_ROOT, 'src-tauri/Cargo.toml')

function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
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

function nextVersion(current, mode) {
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

function updateCargoToml(version) {
  const cargoToml = readFileSync(CARGO_TOML, 'utf8')
  const updated = cargoToml.replace(
    /^version = "\d+\.\d+\.\d+"/m,
    `version = "${version}"`,
  )
  if (updated === cargoToml) throw new Error(`Could not update package version in ${CARGO_TOML}`)
  writeFileSync(CARGO_TOML, updated)
}

function modeFromArgs(args) {
  if (args.includes('--major')) return 'major'
  if (args.includes('--minor')) return 'minor'
  return 'patch'
}

const packageJson = readJson(PACKAGE_JSON)
const tauriConfig = readJson(TAURI_CONFIG)
const currentVersion = String(packageJson.version ?? '')
const newVersion = nextVersion(currentVersion, modeFromArgs(process.argv.slice(2)))

packageJson.version = newVersion
tauriConfig.version = newVersion
writeJson(PACKAGE_JSON, packageJson)
writeJson(TAURI_CONFIG, tauriConfig)
updateCargoToml(newVersion)

console.log(`Bumped Grimoire build version: ${currentVersion} -> ${newVersion}`)

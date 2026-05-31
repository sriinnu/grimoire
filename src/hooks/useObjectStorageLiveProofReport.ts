import { useState } from 'react'
import { APP_STORAGE_KEYS } from '../constants/appStorage'
import {
  appendObjectStorageLiveProofReport,
  parseObjectStorageLiveProofReport,
  parseObjectStorageLiveProofReports,
  type ObjectStorageLiveProofReportHistory,
  type ObjectStorageLiveProofReport,
} from '../lib/objectStorageLiveProofReport'

type ProofReportStorage = Pick<Storage, 'getItem' | 'removeItem' | 'setItem'>

/** Reads a redacted object-storage proof report from local app storage. */
export function readStoredObjectStorageLiveProofReport(
  storage: ProofReportStorage,
): ObjectStorageLiveProofReport | null {
  const reports = readStoredObjectStorageLiveProofReports(storage)
  return reports.at(-1) ?? null
}

/** Reads all locally cached redacted object-storage proof reports. */
export function readStoredObjectStorageLiveProofReports(
  storage: ProofReportStorage,
): readonly ObjectStorageLiveProofReport[] {
  try {
    const historyReports = parseObjectStorageLiveProofReports(
      storage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory),
    )
    if (historyReports.length > 0) return historyReports
    return parseObjectStorageLiveProofReports(storage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReport))
  } catch {
    return []
  }
}

/** Stores only the sanitized proof-report shape, never the raw pasted provider output. */
export function writeStoredObjectStorageLiveProofReport(
  storage: ProofReportStorage,
  report: ObjectStorageLiveProofReport,
): void {
  const sanitized = parseObjectStorageLiveProofReport(report)
  if (!sanitized) return

  try {
    const currentHistory = storage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory)
      ?? storage.getItem(APP_STORAGE_KEYS.objectStorageLiveProofReport)
    storage.setItem(APP_STORAGE_KEYS.objectStorageLiveProofReport, JSON.stringify(sanitized))
    const history = appendObjectStorageLiveProofReport(currentHistory, sanitized)
    storage.setItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory, JSON.stringify(history))
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

/** Stores a complete sanitized proof-report history and keeps the legacy latest key in sync. */
export function writeStoredObjectStorageLiveProofReportHistory(
  storage: ProofReportStorage,
  history: ObjectStorageLiveProofReportHistory,
): void {
  const reports = parseObjectStorageLiveProofReports(history)
  const latest = reports.at(-1)
  try {
    storage.setItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory, JSON.stringify({ ...history, reports }))
    if (latest) storage.setItem(APP_STORAGE_KEYS.objectStorageLiveProofReport, JSON.stringify(latest))
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

/** Removes the locally cached redacted object-storage proof report. */
export function clearStoredObjectStorageLiveProofReport(storage: ProofReportStorage): void {
  try {
    storage.removeItem(APP_STORAGE_KEYS.objectStorageLiveProofReport)
    storage.removeItem(APP_STORAGE_KEYS.objectStorageLiveProofReportHistory)
  } catch {
    // Ignore unavailable or restricted localStorage implementations.
  }
}

/** Keeps pasted provider proof evidence durable across Settings close/open without storing secrets. */
export function useObjectStorageLiveProofReport(): {
  clearProofReport: () => void
  proofReport: ObjectStorageLiveProofReport | null
  proofReports: readonly ObjectStorageLiveProofReport[]
  storeProofReport: (report: ObjectStorageLiveProofReport) => void
} {
  const [proofReports, setProofReports] = useState<readonly ObjectStorageLiveProofReport[]>(() => {
    if (typeof window === 'undefined') return []
    return readStoredObjectStorageLiveProofReports(window.localStorage)
  })
  const [proofReport, setProofReport] = useState<ObjectStorageLiveProofReport | null>(() => proofReports.at(-1) ?? null)

  function storeProofReport(report: ObjectStorageLiveProofReport) {
    const sanitized = parseObjectStorageLiveProofReport(report)
    if (!sanitized) return
    setProofReport(sanitized)
    const history = appendObjectStorageLiveProofReport(proofReports, sanitized)
    setProofReports(history.reports)
    if (typeof window !== 'undefined') {
      writeStoredObjectStorageLiveProofReportHistory(window.localStorage, history)
    }
  }

  function clearProofReport() {
    setProofReport(null)
    setProofReports([])
    if (typeof window !== 'undefined') {
      clearStoredObjectStorageLiveProofReport(window.localStorage)
    }
  }

  return { clearProofReport, proofReport, proofReports, storeProofReport }
}

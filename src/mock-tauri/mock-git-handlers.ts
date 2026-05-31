import type { ModifiedFile } from '../types'

function mockModifiedFiles(): ModifiedFile[] {
  return [
    { path: '/Users/mock/Grimoire/26q1-grimoire-app.md', relativePath: '26q1-grimoire-app.md', status: 'modified' },
    { path: '/Users/mock/Grimoire/facebook-ads-strategy.md', relativePath: 'facebook-ads-strategy.md', status: 'modified' },
    { path: '/Users/mock/Grimoire/ai-agents-primer.md', relativePath: 'ai-agents-primer.md', status: 'added' },
    { path: '/Users/mock/Grimoire/old-draft.md', relativePath: 'old-draft.md', status: 'deleted' },
  ]
}

let mockHasChanges = true
const mockSavedSinceCommit = new Set<string>()

/** Returns deterministic mock git history for browser and component tests. */
export function mockFileHistory(path: string) {
  const filename = path.split('/').pop()?.replace('.md', '') ?? 'unknown'
  const ts = Math.floor(Date.now() / 1000)
  return [
    { hash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', shortHash: 'a1b2c3d', message: `Update ${filename} with latest changes`, author: 'Mira Sen', date: ts - 86400 * 2 },
    { hash: 'e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3', shortHash: 'e4f5g6h', message: `Add new section to ${filename}`, author: 'Mira Sen', date: ts - 86400 * 5 },
    { hash: 'i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6', shortHash: 'i7j8k9l', message: `Fix formatting in ${filename}`, author: 'Mira Sen', date: ts - 86400 * 12 },
    { hash: 'm0n1o2p3q4r5s6t7u8v9w0x1y2z3a4b5c6d7e8f9', shortHash: 'm0n1o2p', message: `Create ${filename}`, author: 'Mira Sen', date: ts - 86400 * 30 },
  ]
}

/** Returns current mock modified files, including saves performed during tests. */
export function getMockModifiedFiles(): ModifiedFile[] {
  const base = mockHasChanges ? mockModifiedFiles() : []
  const basePaths = new Set(base.map(f => f.path))
  const extra: ModifiedFile[] = [...mockSavedSinceCommit]
    .filter(p => !basePaths.has(p))
    .map(p => ({ path: p, relativePath: p.replace(/^.*?\/Grimoire\//, ''), status: 'modified' as const }))
  return [...base, ...extra]
}

/** Tracks a saved path as modified for mock git status. */
export function trackMockChange(path: string): void {
  mockSavedSinceCommit.add(path)
}

/** Simulates a git commit and clears mock pending changes. */
export function commitMockChanges(message: string): string {
  const count = (mockHasChanges ? mockModifiedFiles().length : 0) + mockSavedSinceCommit.size
  mockHasChanges = false
  mockSavedSinceCommit.clear()
  return `[main abc1234] ${message}\n ${count} files changed`
}

/** Returns a deterministic mock file diff. */
export function mockFileDiff(path: string): string {
  const filename = path.split('/').pop() ?? 'unknown'
  if (filename === 'old-draft.md') {
    return `diff --git a/${filename} b/${filename}
deleted file mode 100644
index abc1234..0000000
--- a/${filename}
+++ /dev/null
@@ -1,7 +0,0 @@
----
-title: Old Draft
-type: Note
----
-
-# Old Draft
-
-This note was deleted.`
  }
  return `diff --git a/${filename} b/${filename}
index abc1234..def5678 100644
--- a/${filename}
+++ b/${filename}
@@ -1,8 +1,10 @@
 ---
 title: Example Note
 type: Note
+status: Active
 ---

 # Example Note

-This is the original content.
+This is the updated content.
+
+A new paragraph has been added.`
}

/** Returns a deterministic mock diff for a specific commit. */
export function mockFileDiffAtCommit(path: string, commitHash: string): string {
  const filename = path.split('/').pop() ?? 'unknown'
  const shortHash = commitHash.slice(0, 7)
  return `diff --git a/${filename} b/${filename}
index abc1234..${shortHash} 100644
--- a/${filename}
+++ b/${filename}
@@ -5,3 +5,5 @@
 ---

 # Example Note
-Old paragraph from before ${shortHash}.
+Updated paragraph at commit ${shortHash}.
+
+New content added in this commit.`
}

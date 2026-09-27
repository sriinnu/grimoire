import type { TagSnapshot } from './bodyIndexCore'

export interface IndexedNoteInput {
  path: string
  content: string
}

export type WorkerRequest =
  | { type: 'update'; notes: IndexedNoteInput[] }
  | { type: 'remove'; paths: string[] }
  | { type: 'clear' }
  | { type: 'flush'; id: number }
  | { type: 'mentions'; id: number; phrase: string; limit?: number }

export type WorkerResponse =
  | { type: 'snapshot'; snapshot: TagSnapshot }
  | { type: 'flushed'; id: number }
  | { type: 'mentions'; id: number; paths: string[] }

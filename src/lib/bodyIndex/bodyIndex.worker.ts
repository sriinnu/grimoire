/// <reference lib="webworker" />
import { createBodyIndexWorkerHandler } from './bodyIndexWorkerHandler'
import type { WorkerRequest } from './bodyIndexProtocol'

const scope = self as unknown as DedicatedWorkerGlobalScope
const handle = createBodyIndexWorkerHandler((message) => scope.postMessage(message))

scope.onmessage = (event: MessageEvent<WorkerRequest>) => handle(event.data)

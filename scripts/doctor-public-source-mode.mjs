const VALID_MODES = new Set(['all', 'browser', 'native'])

function normalizeMode(mode) {
  if (!VALID_MODES.has(mode)) {
    throw new Error(`Unsupported source doctor mode "${mode}". Use all, browser, or native.`)
  }
  return mode
}

function readModeValue(argv, index) {
  const mode = argv[index + 1]
  if (!mode || mode.startsWith('--')) {
    throw new Error('--mode requires all, browser, or native')
  }
  return mode
}

/**
 * Parses source doctor CLI arguments.
 */
export function parseDoctorSourceArgs(argv) {
  const args = { mode: 'all', selfTest: false }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--') continue
    if (arg === '--self-test') args.selfTest = true
    else if (arg === '--browser') args.mode = 'browser'
    else if (arg === '--native') args.mode = 'native'
    else if (arg === '--all') args.mode = 'all'
    else if (arg === '--mode') {
      args.mode = readModeValue(argv, index)
      index += 1
    } else if (arg.startsWith('--mode=')) {
      args.mode = arg.slice('--mode='.length)
    } else {
      throw new Error(`Unknown source doctor argument "${arg}"`)
    }
  }
  args.mode = normalizeMode(args.mode)
  return args
}

/**
 * Reports whether the selected source doctor mode is ready.
 */
export function doctorModeReady(result, mode = 'all') {
  const selectedMode = normalizeMode(mode)
  if (selectedMode === 'browser') return Boolean(result?.browser?.ok)
  return Boolean(result?.browser?.ok && result?.native?.ok)
}

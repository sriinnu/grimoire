/// <reference types="vitest/config" />
import path from 'path'
import fs from 'fs'
import os from 'os'
import { execSync } from 'child_process'
import { defineConfig, type Plugin, type ServerOptions } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { vaultApiPlugin } from './scripts/viteVaultApiPlugin'
const vitestCoverageDirectory = process.env.VITEST_COVERAGE_DIR
  ?? path.join(os.tmpdir(), 'grimoire-vitest-coverage', String(process.pid))

const devServerWatchIgnored = [
  '**/coverage/**',
  '**/test-results/**',
  '**/playwright-report/**',
  '**/dist/**',
  '**/src-tauri/target/**',
]

// Build stamp baked into the bundle so the running app can state exactly which
// frontend it is — version alone repeats across local builds, so we add the
// build time and the short git SHA to make every build uniquely identifiable.
function resolveGitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: __dirname,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString().trim()
  } catch {
    return 'nogit'
  }
}
const appBuildVersion: string = (() => {
  try {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')).version
  } catch {
    return '0.0.0'
  }
})()
const appBuildTime = new Date().toISOString()
const appBuildSha = resolveGitSha()

const devHttpsCertPath = path.resolve(__dirname, 'certs/localhost+2.pem')
const devHttpsKeyPath = path.resolve(__dirname, 'certs/localhost+2-key.pem')
const localThemePackPath = path.resolve(__dirname, '.grimoire-local/theme-pack.json')

/** Return local HTTPS config only when explicitly requested and cert files exist. */
function localDevHttpsConfig(): ServerOptions['https'] | undefined {
  if (process.env.GRIMOIRE_DEV_HTTPS !== '1') return undefined
  if (!fs.existsSync(devHttpsCertPath) || !fs.existsSync(devHttpsKeyPath)) {
    throw new Error(
      '[grimoire] GRIMOIRE_DEV_HTTPS=1 requires certs/localhost+2.pem and certs/localhost+2-key.pem. See certs/README.md.',
    )
  }

  return {
    cert: fs.readFileSync(devHttpsCertPath),
    key: fs.readFileSync(devHttpsKeyPath),
  }
}

/** WebSocket proxy info endpoint — tells the frontend where the MCP bridge is */
function mcpBridgeInfoPlugin(): Plugin {
  return {
    name: 'mcp-bridge-info',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/api/mcp/info') return next()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({
          wsUrl: `ws://localhost:${process.env.MCP_WS_PORT || 9710}`,
          available: true,
        }))
      })
    },
  }
}

/** Serves and hot-reloads the gitignored local theme-pack file in dev only. */
function localThemePackPlugin(): Plugin {
  return {
    name: 'grimoire-local-theme-pack',
    configureServer(server) {
      server.watcher.add(localThemePackPath)
      server.watcher.on('change', (changedPath) => {
        if (path.resolve(changedPath) !== localThemePackPath) return
        server.ws.send({
          type: 'custom',
          event: 'grimoire:local-theme-pack-changed',
          data: { updatedAt: Date.now() },
        })
      })

      server.middlewares.use((req, res, next) => {
        if (req.method !== 'GET' || req.url !== '/api/theme-pack/local') return next()
        fs.readFile(localThemePackPath, 'utf8', (error, content) => {
          if (error) {
            res.statusCode = error.code === 'ENOENT' ? 204 : 500
            res.end('')
            return
          }
          res.setHeader('Content-Type', 'application/json')
          res.end(content)
        })
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // Asset base path. Defaults to "/" for the Tauri app and local dev; the
  // GitHub Pages browser-demo build sets GRIMOIRE_BASE_PATH=/grimoire/ so assets
  // resolve under the project-pages subpath.
  base: process.env.GRIMOIRE_BASE_PATH || '/',

  plugins: [react(), tailwindcss(), vaultApiPlugin(), mcpBridgeInfoPlugin(), localThemePackPlugin()],

  resolve: {
    alias: {
      '@grimoire/markdown-editor/math': path.resolve(__dirname, './markdown-editor/packages/js/src/mathTypes.ts'),
      '@grimoire/markdown-editor/react': path.resolve(__dirname, './markdown-editor/packages/js/src/react/index.ts'),
      '@grimoire/markdown-editor': path.resolve(__dirname, './markdown-editor/packages/js/src'),
      '@': path.resolve(__dirname, './src'),
    },
  },

  // Inject the demo-vault-v2 path in local dev only — production Tauri builds and
  // CI must resolve the default vault path at runtime via the backend to avoid
  // baking the CI runner's absolute path into the distributed bundle.
  define: {
    __APP_VERSION__: JSON.stringify(appBuildVersion),
    __BUILD_TIME__: JSON.stringify(appBuildTime),
    __GIT_SHA__: JSON.stringify(appBuildSha),
    ...(command !== 'serve' || process.env.CI || (process.env.TAURI_PLATFORM && !process.env.TAURI_DEBUG)
      ? {}
      : { __DEMO_VAULT_PATH__: JSON.stringify(path.resolve(__dirname, 'demo-vault-v2')) }),
  },

  // Prevent vite from obscuring Rust errors
  clearScreen: false,

  // Tauri expects a fixed port
  server: {
    port: 5202,
    strictPort: true,
    allowedHosts: true,
    https: localDevHttpsConfig(),
    watch: {
      ignored: devServerWatchIgnored,
    },
  },

  // Env variables starting with TAURI_ are exposed to the frontend
  envPrefix: ['VITE_', 'TAURI_'],

  build: {
    // Tauri uses Chromium on Windows and WebKit on macOS/Linux
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    // Don't minify for debug builds
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // Produce sourcemaps for debug builds
    sourcemap: !!process.env.TAURI_DEBUG,
  },

  test: {
    globals: true,
    environment: 'jsdom',
    // Node 26 can crash during V8 concurrent marking when the full jsdom suite
    // runs in worker threads. Forks isolate each worker process and keep the
    // pre-push lane deterministic.
    pool: 'forks',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'markdown-editor/packages/js/src/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      // Keep coverage temp files off the mounted workspace to avoid flaky
      // read-after-write races when Vitest re-reads its own coverage shards.
      reportsDirectory: vitestCoverageDirectory,
      include: ['src/**/*.{ts,tsx}', 'markdown-editor/packages/js/src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'markdown-editor/packages/js/src/**/*.{test,spec}.{ts,tsx}',
        'src/test/**',
        'src/mock-tauri.ts',
        'src/main.tsx',
        'src/types.ts',
        'src/hooks/useMcpBridge.ts',
        'src/hooks/useAiAgent.ts',
        'src/utils/ai-chat.ts',
        'src/utils/ai-agent.ts',
        'src/components/ui/dropdown-menu.tsx',
        'src/components/ui/scroll-area.tsx',
        'src/components/ui/select.tsx',
        'src/components/ui/separator.tsx',
        'src/components/ui/tabs.tsx',
        'src/components/ui/tooltip.tsx',
        'src/components/ui/card.tsx',
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70,
      },
    },
  },
}))

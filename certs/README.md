# Local Development Certificates

This directory is for machine-local HTTPS certificates used by `pnpm dev:https`.

Expected local files:

- `localhost+2.pem`
- `localhost+2-key.pem`

These files are ignored by Git because the private key is machine-local. Copy them from a trusted local source or regenerate them with `mkcert` / `openssl`.

Commands:

- Browser HTTPS dev: `pnpm dev:https`
- Tauri HTTPS dev: `pnpm tauri:https`

Normal `pnpm dev` and `pnpm tauri dev` continue to use HTTP.

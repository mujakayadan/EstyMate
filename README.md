# Esty Mate

Online numerical estimation party game for 2–6 players on separate devices.

Host creates a room, shares a 4-character code or `/?room=CODE` link, everyone estimates the same number live, and the closest guess scores the round.

## Run locally (Windows / macOS / Linux)

Node 24 (see `.node-version`).

```bash
npm install
npm run dev
```

- Web UI: [http://127.0.0.1:43127](http://127.0.0.1:43127)
- Socket.io: `http://127.0.0.1:43128`

Optional env:

- `PORT` (default `43127`)
- `SOCKET_PORT` (default `43128`)
- `HOST` (default `0.0.0.0`)
- `NEXT_PUBLIC_SOCKET_URL` (defaults to `hostname:43128`)

Smoke two sockets without a browser (socket server must be listening, e.g. via `npm run dev`):

```bash
npm run smoke:rooms
```

Browser UI smoke (app must be running, e.g. `npm run dev`):

```bash
npm run smoke:browsers
```

## Stack

- Next.js App Router + TypeScript + Tailwind
- Socket.io in-memory rooms (restart clears rooms)
- 8 rounds from a 30-question bank

## Contributing

- Feature branches: `<github-user>/<type>/<kebab-name>` targeting `dev`. Titles use Conventional Commits.
- `main` accepts promotions from `dev` (or `qa`/`staging`) and Dependabot / release-please PRs.
- CI runs `lint`, `build`, and `smoke:rooms`.

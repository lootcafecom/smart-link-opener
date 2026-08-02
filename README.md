# Smart Link Opener

A working smart-link / "open in app" service, in the spirit of tools like
LinkTwin or OpeninApp: paste a URL, get back a short redirect link that tries
to open the destination in its native app (YouTube, Instagram, Spotify,
Amazon, X, TikTok, Facebook) and falls back to the mobile browser if the app
isn't installed.

Tested end-to-end during development: link creation, validation, slug
conflicts, click counting, and deep-link generation for YouTube and Spotify
all verified working against a real Postgres database.

## How it works

1. **Frontend** (`frontend/`) — a plain HTML/CSS/JS page. You paste a
   destination URL (and optionally choose a custom slug), and it calls the
   backend API to create a link.
2. **Backend** (`backend/`) — a Node/Express server with three jobs:
   - `POST /api/links` — creates a link (random or custom slug), stored in Postgres.
   - `GET /api/links/:slug` — returns metadata + click count for a link.
   - `GET /:slug` — the actual redirect endpoint. It looks up the destination
     URL, increments the click counter, detects iOS vs Android from the
     User-Agent, and serves a tiny landing page that:
     - On Android, redirects via an `intent://` URL (which carries its own
       app-store fallback).
     - On iOS, redirects via the app's custom URL scheme (e.g.
       `vnd.youtube://`), then falls back to the normal `https://` URL after
       ~1.5s if the app didn't open.
     - On desktop or unrecognized domains, redirects straight to the
       destination URL.

App-matching rules live in `backend/src/lib/deeplink.js` — it's a small,
readable table you can extend with more apps (see below).

## Prerequisites

- Node.js 18+
- PostgreSQL 13+ (local install, or a hosted instance — Render, Supabase,
  Neon, Railway all work)

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL` to your Postgres connection string, e.g.:

```
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/smartlinks
```

Create the database (if using a local Postgres install):

```bash
createdb smartlinks
```

The app auto-creates its `links` table on startup — you don't need to run
`schema.sql` manually (it's there for reference/manual setup if you'd rather
not rely on auto-migration).

Start the server:

```bash
npm start        # or: npm run dev  (auto-restarts on file changes)
```

Then open **http://localhost:3000** — the backend serves the frontend
directly, so there's nothing separate to run or deploy for the UI.

## Testing it

```bash
# Create a link
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{"destinationUrl":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'

# -> {"slug":"aB3xQ9z","shortUrl":"http://localhost:3000/aB3xQ9z", ...}

# Visit http://localhost:3000/aB3xQ9z on a phone to see the app-opening
# behavior. On desktop it just forwards straight to the YouTube URL.
```

## Deploying

This is a single Node process serving both frontend and API, so it deploys
like any standard Express app:

- **Render / Railway / Fly.io**: point them at `backend/`, set the
  `DATABASE_URL` env var to a managed Postgres instance, run `npm start`.
- **Your own VPS**: `npm install --production`, run behind `pm2` or
  `systemd`, reverse-proxy through nginx/Caddy for HTTPS.

Set `DATABASE_SSL=true` in `.env` if your Postgres provider requires SSL
(most hosted ones do).

## Extending it

- **More apps**: add an entry to the `RULES` array in
  `backend/src/lib/deeplink.js` — each rule just needs a hostname test, an
  Android package name, and a function that builds the iOS URL scheme.
- **Analytics dashboard**: the `clicks` and `created_at` columns are already
  there; add a `GET /api/links` list endpoint and a simple table view in the
  frontend.
- **Custom domains / QR codes**: both are additive — a QR code is just an
  image generated client-side from the `shortUrl` string.

## What this doesn't include (by design — this was scoped as an MVP)

- User accounts / auth
- Analytics dashboard UI (the data is tracked, just not visualized)
- Rate limiting / abuse protection — add something like `express-rate-limit`
  before putting this on the open internet
- Link expiration or deletion

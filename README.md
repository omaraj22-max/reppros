# Pipeline Audit — Reputation Pros

Flow chart + audit checklist + workflow sheet + client-facing report, with **state shared across every visitor** (Upstash Redis).

## Structure

```
index.html      → the whole app (flow chart, audit, workflows, tasks, report)
api/state.js    → serverless function (Node.js runtime) that reads/writes the "audit-state" key in Redis
vercel.json     → rewrites /flow /audit /workflows /tasks /report to index.html
```

No `package.json` needed: Vercel serves `index.html` as a static file and picks up `api/state.js` as a serverless function automatically.

## Routes

Every section has its own URL, so it can be shared and survives a refresh:

| URL | Section |
|---|---|
| `/` or `/flow` | Flow chart |
| `/audit` | Audit checklist |
| `/workflows` | Workflow audits |
| `/tasks` | Other tasks |
| `/report` | Report |

`vercel.json` rewrites those paths to `index.html` and the app reads `location.pathname` on load.
Opened as a plain file (`file://`) there are no routes, so it falls back to a hash (`index.html#/audit`).

## Vercel setup

1. Push the repo to Vercel (`vercel` CLI or import from GitHub).
2. Connect a Redis database under **Storage → Connect Database** (Upstash). The project needs these env vars — either name works:
   - `KV_REST_API_URL` + `KV_REST_API_TOKEN`, or
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
3. **Redeploy** — env vars only reach new deployments. `/api/state` returns a clear 500 explaining what is missing if they are absent.

## How the shared state works

- **On load**: `GET /api/state`. If Redis has data, it replaces `nodes`, `edges`, `audit`, `workflows` and re-renders; otherwise the defaults baked into the HTML are used.
- **On any edit** (checkpoints, notes, status, moving/creating/deleting steps and connections, labels, workflow rows): `saveState()` POSTs the whole state with a **1.5s debounce**. Last write wins.
- **Header indicator**: `Saving…` → `Saved`, or `Save failed` (auto-retries every 5s; click it to retry immediately).
- **localStorage backup** (key `audit-state-local`): every change is written locally first. On load the priority is local-unsynced > server > local. If it restores from local, it re-syncs to Redis on its own — so a refresh never loses work even if the API is down.
- Closing the tab with pending changes fires one last save via `sendBeacon`.
- **Export / Import JSON** (in the ⋯ menu) still work as a manual backup; an Import also uploads that state to Redis.
- **Reset** restores the original flow **for everyone**.

## API

- `GET /api/state` → JSON `{nodes, edges, audit, workflows, tasks}` or `null` if nothing has been saved yet.
- `POST /api/state` with body `{nodes, edges, audit, workflows, tasks}` → `{ok: true}`. Validates the shape (400 if it does not match).

## Keyboard shortcuts (Audit checklist)

| Key | Action |
|---|---|
| `1` | Mark checkpoint as working |
| `2` | Mark checkpoint as not audited |
| `3` | Mark checkpoint as failing |
| `↑` `↓` | Move between checkpoints |

## Local development

`vercel dev` with the env vars in `.env.local`, or just open `index.html` (with no API it runs on the defaults and the save indicator shows an error).

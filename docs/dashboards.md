# RapidX Live Dashboards — Loop & Command Center

Two live, browser-based dashboards ship with RapidX:

| Dashboard | Command | Scope | Watches |
|---|---|---|---|
| **RapidX Loop** | `/rapidx:loop` | One engagement, one repo | Autonomous build progress: spec → plan → phases → verification |
| **RapidX Command** | `/rapidx:command-center` | The whole machine, every opted-in repo | A fleet of Claude Code sessions: agent wall, escalations, event stream, hold/resume/stop |

Both work the same way under the hood: a zero-dependency Node `http` server
renders a single HTML page and pushes updates over Server-Sent Events (SSE).
Both also support an **optional read-only Azure mirror** — a polled, static
copy of the same page for sharing a status link with people (or devices)
that shouldn't have local access.

This doc covers install → local dashboard → Azure mirror, for both.

---

## 1. Install RapidX

Standard install, nothing dashboard-specific required up front:

```
npx rapidx-platform
```

(or `npm install -g rapidx-platform && rapidx` for a persistent CLI). Follow
the interactive prompts — platform detection, tech stack questionnaire,
profile selection. Two things happen automatically, for every profile,
regardless of what you pick in the questionnaire:

- **`.rapidx/` core is installed in the current repo** — engine, hooks,
  invariants dir, knowledge-graph lib.
- **`~/.rapidx-command/` is seeded once, in your home directory** — the
  Command Center's collector, dashboard HTML, and launcher. This happens
  once per machine (`seedCommandCenterHome()` in
  `src/install-rapidx-core.js`); re-running the installer in another repo
  won't duplicate or reset it, so all your repos' fleets end up on the same
  wall.

The Loop Dashboard needs no separate seeding step — `templates/loop-dashboard/`
is copied into each engagement's `.rapidx/loop/dashboard/` the first time you
run `/rapidx:loop` in that repo.

---

## 2. RapidX Loop — local dashboard

1. In a repo, run `/rapidx:loop` and describe what you want built. This
   creates `.rapidx/loop/` (spec, manifest, progress log) and copies
   `templates/loop-dashboard/{server.js,index.html,launch.js}` into
   `.rapidx/loop/dashboard/`.
2. Open the dashboard:
   ```
   node .rapidx/loop/dashboard/launch.js --open
   ```
   This finds a free port (default `4747`, via `RAPIDX_LOOP_PORT`), spawns
   `server.js` detached (survives the terminal closing), health-checks it,
   writes `.rapidx/loop/dashboard/.state.json` (`{ pid, port, startedAt }`),
   and opens your browser.
3. The page connects to `/api/events` (SSE) and polls `/api/state` as a
   fallback. It shows: a percent-verified reactor ring, per-phase build
   sequence timeline, target architecture (parsed from
   `.rapidx/loop/architecture.json`), and a live activity feed tailing
   `.rapidx/loop/progress.jsonl`.
4. Re-running `launch.js --open` while the server is already up just
   reopens the browser — it won't spawn a second instance (health-check
   first).
5. Closing the browser tab does **not** stop the build; the server and the
   `/rapidx:loop` engagement run independently of the dashboard.

Status without a browser: `/rapidx:loop-status` prints a summary table by
hitting `/api/state` directly.

---

## 3. RapidX Command — local console (multi-repo fleet)

The collector is **one shared process for the whole machine**, not one per
repo — so opting in from repo A and repo B puts both on the same wall.

1. In each repo you want on the fleet wall, run `/rapidx:command-center`.
   This:
   - Confirms `~/.rapidx-command/launch.js` exists (installer already seeded
     it — if missing, reinstall RapidX).
   - Runs `node ~/.rapidx-command/init-hooks.js` from the current repo,
     which writes `.rapidx/command/identity.json` (a generated
     `correlation_id`, `repo` name, default `agent_id`) and merges
     `command-emit`/`command-gate` hook registrations into that repo's
     `.claude/settings.json` (additive — never touches unrelated keys).
   - Runs `node ~/.rapidx-command/launch.js --open` (default port `4767`,
     via `RAPIDX_COMMAND_PORT`) and opens the console.
2. Every subsequent tool call in that repo now emits an event
   (`command-emit.js`, fire-and-forget, fail-open — a collector outage
   never blocks a build) and is subject to fleet control
   (`command-gate.js`, the only hook allowed to block a tool call).
3. The console shows, grouped by repo: an agent wall (status, last
   message, phase/loop/branch, a short per-agent lane strip), an
   escalations inbox, KPIs (agents running, awaiting you, events today,
   tokens observed), and a unified event stream.
4. **Hold / Resume / Stop** (per-agent buttons, or the header's *Hold
   Fleet* / *Stop All*) write `~/.rapidx-command/data/control/<correlation_id>.json`.
   `command-gate.js` reads that file on the next tool call in the affected
   repo and blocks with an instruction-style reason. This is a **soft
   block** — a hook can only block the next tool call, not kill the parent
   CLI process, so "Stop" means *every subsequent tool call is blocked
   until resumed*, not an immediate process kill.
5. **Escalation answers are audit-only** in this MVP — there's no
   `ask_operator` MCP tool wired up yet, so recording an answer doesn't
   auto-resume a waiting agent. The UI says so on every escalation card.

Status without a browser: `/rapidx:command-center-status` prints an
agents/KPI summary by hitting `/api/state`.

---

## 4. Azure mirror (optional) — for both dashboards

Local dashboards need no cloud account at all. The Azure mirror is a
**separate, read-only** static page: a rolled-up snapshot (no firehose),
polled on an interval, with no path back to hold/resume/stop or answer
escalations. Use it for a shareable status link or checking the fleet from
a phone.

### 4a. What gets deployed

- **Storage**: one Blob container per dashboard (`command`, `loop`), each
  holding a single `snapshot.json` blob that the local server/collector
  overwrites roughly every 45s.
- **Static Web App**: two static pages —
  `templates/command-center/azure/static-index.html` and
  `templates/loop-dashboard/azure/static-index.html` — each polling its
  blob's SAS read URL every 20s via plain `fetch()`. No SDK, no server,
  no build step.

### 4b. Wiring the local server/collector to Azure

Both `templates/command-center/collector.js` and
`templates/loop-dashboard/server.js` resolve a **write** SAS URL the same
way, in order:

1. `RAPIDX_COMMAND_AZURE_SAS_URL` / `RAPIDX_LOOP_AZURE_SAS_URL` env var, or
2. a config file — `~/.rapidx-command/azure-config.json` /
   `~/.rapidx-loop-azure.json` — each shaped `{"sas_url": "<write SAS URL>"}`.

The SAS URL is read **once at process start**; after writing or rotating
the config file, restart the collector/`loop` server for it to take
effect. If no SAS URL resolves, the mirror timer never starts — this is a
strict opt-in, zero cost/behavior change for anyone not using it.

The PUT itself is a plain `https.request` with `x-ms-blob-type: BlockBlob`
(a SAS URL already carries auth, so no Azure SDK is needed) and
`family: 4` explicitly set — some networks resolve Azure hostnames to an
IPv6 address that resets on connect, and forcing IPv4 avoids a silent,
fail-open mirror outage.

### 4c. Provisioning Azure resources from scratch

```
# Storage account + private containers
az group create -n <rg> -l <region>
az storage account create -n <account> -g <rg> -l <region> --sku Standard_LRS
az storage container create --account-name <account> -n command --public-access off
az storage container create --account-name <account> -n loop --public-access off

# Blob-level SAS tokens — one write pair (collector) and one read pair (static page) per blob
az storage blob generate-sas --account-name <account> -c command -n snapshot.json \
  --permissions acw --expiry <date> -o tsv   # write
az storage blob generate-sas --account-name <account> -c command -n snapshot.json \
  --permissions r --expiry <date> -o tsv      # read
# repeat for the loop container/blob

# CORS — required for the browser fetch() on the static page to succeed
# (server-side curl/node https calls are NOT subject to CORS, so this step
# is easy to miss during verification — test with a real preflight, not curl)
az storage cors add --account-name <account> --services b \
  --methods GET HEAD OPTIONS --origins "https://<your-swa-hostname>" \
  --allowed-headers "*" --exposed-headers "*" --max-age 3600

# Static Web App (no repo/CI linkage — deployed directly via the SWA CLI)
az staticwebapp create -n <swa-name> -g <rg> -l <region> --sku Free
```

Point the local server/collector at the **write** URLs (env var or config
file, per 4b above) and restart them.

Bake the **read** URLs into the static pages and deploy:

```
mkdir -p /tmp/swa-deploy/command /tmp/swa-deploy/loop
cp templates/command-center/azure/static-index.html /tmp/swa-deploy/command/index.html
cp templates/loop-dashboard/azure/static-index.html /tmp/swa-deploy/loop/index.html
# edit each copy's `var BLOB_URL = '...'` to the current read SAS URL
# (or skip this and load with ?src=<read SAS URL> instead)

TOKEN=$(az staticwebapp secrets list -n <swa-name> -g <rg> --query "properties.apiKey" -o tsv)
NODE_OPTIONS=--dns-result-order=ipv4first \
  npx -y @azure/static-web-apps-cli deploy /tmp/swa-deploy --deployment-token "$TOKEN" --env production
```

`NODE_OPTIONS=--dns-result-order=ipv4first` works around the same
IPv6-resolution issue as `family: 4` above — without it, `npx`/the SWA
CLI's own binary-metadata fetch can hang or reset on some networks.

### 4c. Redeploying after an edit or SAS rotation

Same steps as above, minus resource creation: copy the two
`static-index.html` files into a deploy folder, update `BLOB_URL`, run the
`npx @azure/static-web-apps-cli deploy` command with the existing
deployment token.

### 4d. This machine's live instance

A real instance is already provisioned and wired up here — resource
names, live URL, SAS expiry, and exact redeploy commands are documented in
[`templates/command-center/azure/README.md`](../templates/command-center/azure/README.md).
That file is the source of truth for *this* deployment; this doc is the
general how-it-works reference.

---

## 5. Troubleshooting

- **Mojibake (`â€”` instead of `—`) on a static page**: missing
  `<meta charset="utf-8">`. Both `static-index.html` files start with it —
  if you've forked/edited them, keep it as the first line inside `<head>`.
- **Static page stuck on "Loading…"**: almost always CORS, not a broken
  URL. `curl`/Node `https` calls aren't subject to CORS so they'll succeed
  even when a browser's `fetch()` is silently blocked — check
  `az storage cors list --account-name <account> --services b` isn't empty,
  and verify with a real `OPTIONS` preflight (see 4c) rather than a plain
  GET.
- **Mirror never lands data / collector logs show nothing but the blob
  stays empty**: check the collector/server process actually restarted
  after you wrote the SAS config file (it's read once at startup), and
  that outbound HTTPS to `*.blob.core.windows.net` isn't blocked.
- **Command Center wall is empty after `/rapidx:command-center`**: confirm
  `.rapidx/command/identity.json` exists in that repo and that
  `.claude/settings.json` has the `command-emit`/`command-gate` hook
  entries — both are written by `init-hooks.js`, which only runs when you
  invoke `/rapidx:command-center` (not at install time).

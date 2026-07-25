# RapidX Command — Azure mirror (optional)

The local console (`node ~/.rapidx-command/launch.js --open`) is the
primary, full-featured (Observe + Interrupt) interface and works with no
Azure account at all. The Azure mirror is a **read-only** view of the
fleet — a rolled-up snapshot (agent wall + KPIs + last 50 events), suitable
for sharing a status link with people who shouldn't have interrupt
capability, or for checking the fleet from a phone. It cannot hold/resume/
kill or answer escalations — see the banner on `static-index.html`.

## Live instance

A real instance is provisioned and wired up for this machine:

| Resource | Name | Notes |
|---|---|---|
| Resource group | `rg-rapidx-command` | region `eastus2` |
| Storage account | `strapidxcmd7337b6` | `Standard_LRS` |
| Blob containers | `command`, `loop` | private, one blob each (`snapshot.json`) |
| Static Web App | `swa-rapidx-command` | Free tier, deployed via SWA CLI (no CI/repo link) |
| Live URL | https://lively-bay-0bff62d0f.7.azurestaticapps.net | `/command/` and `/loop/` |

Both `~/.rapidx-command/collector.js` and any `/rapidx:loop` engagement's
`.rapidx/loop/dashboard/server.js` are already wired to mirror to these
blobs — see "How the wiring works" below. Nothing further is required to
keep them streaming; this section exists so the resources can be found,
billed, and rotated later.

SAS tokens (both read and write, for both blobs) expire **2027-07-25**.
Before then, regenerate with `az storage blob generate-sas` (blob-level,
not container-level) for `command/snapshot.json` and `loop/snapshot.json`,
write permissions (`acw`) for the collector/server config files below, read
permission (`r`) baked into the deployed static pages, then redeploy per
"Redeploying the static pages" below.

Retrieve the deployment token again anytime with:

```
az staticwebapp secrets list -n swa-rapidx-command -g rg-rapidx-command --query "properties.apiKey" -o tsv
```

## How the wiring works

- `collector.js` and `loop-dashboard/server.js` resolve their SAS write URL
  from (in order): the `RAPIDX_COMMAND_AZURE_SAS_URL` /
  `RAPIDX_LOOP_AZURE_SAS_URL` env var, then a config file —
  `~/.rapidx-command/azure-config.json` and `~/.rapidx-loop-azure.json`
  respectively, each `{"sas_url": "<write SAS URL>"}`. The config file is
  what's set up on this machine; env vars are the alternative for anyone
  who prefers not to persist a file.
- Both mirrors PUT a rolled-up snapshot roughly every 45 seconds via a
  plain `https.request` (`x-ms-blob-type: BlockBlob`) — no Azure SDK, since
  a SAS URL already carries auth. `family: 4` is set on the request
  explicitly because some networks (this one included) resolve Azure's
  hostnames to an IPv6 address that resets on connect — forcing IPv4
  avoids a silent, fail-open mirror outage.
- The SAS URL is read once at process start (`const AZURE_SAS_URL = ...`),
  so a running collector/server must be restarted to pick up a newly
  written or rotated config file.

## Redeploying the static pages

The deployed pages have their `BLOB_URL` baked in (no `?src=` query string
needed). To redeploy after an edit or a SAS rotation:

1. Copy `templates/command-center/azure/static-index.html` and
   `templates/loop-dashboard/azure/static-index.html` into a folder as
   `command/index.html` and `loop/index.html` (plus a root `index.html`
   landing page, optional).
2. Set each copy's `var BLOB_URL = '...'` to the current **read** SAS URL.
3. Deploy:
   ```
   TOKEN=$(az staticwebapp secrets list -n swa-rapidx-command -g rg-rapidx-command --query "properties.apiKey" -o tsv)
   npx -y @azure/static-web-apps-cli deploy <folder> --deployment-token "$TOKEN" --env production
   ```
   If npx's DNS resolves the SWA CLI's download endpoint to IPv6 and hangs
   or resets, retry with `NODE_OPTIONS=--dns-result-order=ipv4first` set —
   the same IPv6 issue as the mirror PUTs above.

## Cost

Blob Storage + a low-traffic Static Web App (Free tier) for a snapshot
polled every 20s by a handful of viewers is a few cents a month.

## Setting this up from scratch (a different subscription/account)

1. **Storage account + containers**
   ```
   az group create -n <rg> -l <region>
   az storage account create -n <account> -g <rg> -l <region> --sku Standard_LRS
   az storage container create --account-name <account> -n command --public-access off
   az storage container create --account-name <account> -n loop --public-access off
   ```
2. **SAS tokens** — blob-level, one write pair and one read pair per blob:
   ```
   az storage blob generate-sas --account-name <account> -c command -n snapshot.json \
     --permissions acw --expiry <date> -o tsv   # write, for the collector
   az storage blob generate-sas --account-name <account> -c command -n snapshot.json \
     --permissions r --expiry <date> -o tsv      # read, for the static page
   ```
   Repeat for the `loop` container/blob.
3. **Point the collector/server at the write URLs** — write
   `~/.rapidx-command/azure-config.json` and `~/.rapidx-loop-azure.json` as
   described above (or export `RAPIDX_COMMAND_AZURE_SAS_URL` /
   `RAPIDX_LOOP_AZURE_SAS_URL`), then (re)start them.
4. **Static Web App**
   ```
   az staticwebapp create -n <swa-name> -g <rg> -l <region> --sku Free
   ```
   No `--source` — this creates an app with no repo linkage, deployed
   directly via the SWA CLI as in "Redeploying the static pages" above.

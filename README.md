# Pretty Pictures

A full-screen artwork slideshow with Harvard gallery filters, named presets, a searchable thumbnail browser, shuffle without repeats, a 1–120 second timer, pause/resume, and artwork details. Catalogs and presets are JSON files. A local Node service handles Harvard discovery and saves; the browser never receives the Harvard API key. React renders museum metadata as text.

## GitHub Pages edition

The hosted edition runs entirely in the browser, with the same gallery builder, named presets, thumbnail browsing, and shuffle. Its filters search the **published discovery catalog**, not the live Harvard API. The initial discovery catalog includes 1,457 unique artworks across ten art types, plus selections for landscapes, nineteenth-century Japanese prints, watercolors, and Monet. The interface shows the current published count. Artist lookup searches creators represented in that catalog, and keyword matching uses published titles/metadata and the refresh's subject tags.

Galleries and custom presets are saved in this browser's storage, scoped to the site's path. They do not overwrite anyone else's gallery or sync between devices; clearing site data removes them. Only selected object IDs are saved for a gallery, so reloading uses the current published metadata. If site storage is blocked, gallery filtering still works for the current page and explains that the selection cannot persist. Preset saves report the storage error.

`npm run build:pages` creates `build-pages/` with the `/pretty-pictures/` base path. The GitHub Actions workflow **Publish Pretty Pictures** tests and deploys this artifact on pushes to `master`. To refresh the hosted collection, use the workflow's **Run workflow** action on `master` and enable **Refresh the published selection from Harvard before deploying**. The workflow reads the repository secret `HARVARD_API_KEY`, refreshes JSON, runs checks, commits the refreshed public catalog, and deploys it. It never puts the key in the browser bundle. There is no scheduled refresh.

Locally, `npm run refresh:discovery` refreshes `public/discovery.json` using the ignored Harvard key. The refresh combines 14 selections, deduplicates object IDs and image URLs, retains relevant subject tags, and atomically replaces the complete catalog after successful requests. The prior version is backed up at `output/discovery.json.bak`. A provider failure preserves the existing catalog. Empty categories are reported in the catalog's source summary and do not prevent other categories from publishing.

For local Pages verification, run `npm run build:pages`, `node --env-file-if-exists=.env.harvard scripts/check-pages-artifact.mjs`, and `npm run test:pages`. These tests serve only static files under the real repository path; they make no gallery-service or authenticated Harvard requests. The normal `npm start` experience below continues to use the local Node service for live Harvard discovery. See [deployment and rollback](docs/DEPLOYMENT.md).

## Run locally

Use Node.js **22.13+ within 22.x, 24.x, or 26+** and npm. Verification used Node 24.14.0 on Windows.

```powershell
npm ci
npm start
```

Open the loopback URL Vite prints. It selects another port if its default is busy. Stop with Ctrl+C. This single command starts both the React app and the Node gallery service on the same loopback address. No separate database, global Firebase CLI, or OpenSSL compatibility flag is required. The existing ignored `.env.harvard` key is loaded automatically.

The starter catalog is **`public/gallery.json`**, populated with 100 paintings from Harvard's collection API. After you build a gallery, the local service serves your saved selection on subsequent visits. The app no longer contacts the original, deactivated Firebase database. Catalog metadata is local; images still load from Harvard and require an internet connection. Choose **View sample artwork** in Settings or on an error screen for five images already bundled in the repository. Those samples have no accompanying metadata, so artist, date and credit remain explicitly unknown.

## Build and browse a gallery

1. Choose **Build a gallery**. Select a named preset or combine filters: art types, a specific artist, culture, year range, medium, technique, and subject/keyword. Search for an artist and choose a result to select that person's museum ID. You can select up to 12 art types; clearing all types searches across the collection.
2. Choose a maximum of **1–500 artworks**, then **Build gallery**. The current selection remains available while Harvard responds. A successful result replaces the local selection; failures and empty searches preserve it. If fewer viewable works are available, the app explains that the gallery is smaller than requested.
3. Use **Browse artwork** to search the current gallery by title, artist, culture, or art type. Browse 24 thumbnails per page and select any work to start viewing there. Harvard IIIF thumbnails use a 320×320 bounding box where supported, with the original image as a fallback.

The five starter presets are **Painting discoveries**, **Landscape paintings**, **Japanese prints · 1800–1899**, **Watercolors**, and **Photography**. Save up to 30 custom named presets, select them after restarting the app, update their filters/name, or delete them. Starter presets can be saved as custom copies. Presets save search settings; building one makes a fresh randomized selection from Harvard.

Filters combine. Dates select works whose estimated dates overlap the requested range and exclude unknown/zero dates. Negative years mean BCE. Medium, culture, technique, and keywords depend on Harvard's catalog text, so availability varies by query. Images unavailable through the API are skipped. The service removes duplicate object IDs and image URLs, uses one random seed across all pages of a build, and scans at most 20 pages of 100 records. It has a 90-second build deadline and 15-second provider-request deadlines. Cancellation stops a pending search; if publication already completed, the saved result is visible after reloading.

## Local service and saved files

`npm start` and `npm run preview` install the Node service in Vite's local server. `npm run preview` requires an existing `npm run build`. The browser calls same-origin `/api/gallery/*` endpoints; only Node calls the authenticated Harvard API. Local Host/Origin checks reject requests from other websites. Museum requests are reads only.

| File | Purpose |
| --- | --- |
| `public/gallery.json` | Starter catalog and catalog included in static builds; still refreshed by the CLI commands below |
| `output/local-gallery/gallery.json` | Latest gallery built in the UI; served as `/gallery.json` while the local service runs |
| `output/local-gallery/presets.json` | Custom named presets |
| `output/local-gallery/*.bak` | Previous complete version of each saved JSON file |
| `.env.harvard` | Local `HARVARD_API_KEY`, ignored by Git and excluded from browser builds |

Interactive saves use a temporary file and atomic rename, with a backup before replacement. A lock prevents simultaneous mutations across local service instances. If a process is forcibly terminated during a change, check that no gallery change is running before removing the stale `output/local-gallery/.mutation.lock` file. A normal cancellation or error releases the lock. To restore a saved file, stop the local app and copy its `.bak` over the corresponding `.json`.

The entire `output/` directory is ignored by Git and sits outside the static build. These file locations apply to the local Node edition. The original `public/gallery.json` is preserved when experimenting in the UI. To return to that starter selection, stop the app and move `output/local-gallery/gallery.json` to a backup location, then restart. CLI refreshes of `public/gallery.json` do not replace a saved interactive selection.

To include an interactive selection as the starter gallery of a future build, explicitly copy `output/local-gallery/gallery.json` to `public/gallery.json` before building. A standard `npm run build` expects the Node service for discovery and presets. The separate `build:pages` edition supports those interactions through catalog filtering and browser storage. Live searches of Harvard's full collection remain available in the local Node edition.

## Gallery configuration

No environment file is needed to view the starter catalog. Vite copies `public/gallery.json` into `build/gallery.json`. To override the playback source, copy `.env.example` to `.env.local` and set `VITE_IMAGES_URL` to another public JSON endpoint. Restart the dev server after changing configuration. Production configuration is embedded at build time. The default URL respects Vite's configured base path. Keep the default `/gallery.json` source when using local gallery persistence; a custom external URL is used again after reloading.

The generated catalog has `schemaVersion: 1`, a UTC `refreshedAt` timestamp, public source information, and a `records` array. Interactive catalogs also store the applied filters and random seed. Records use Harvard's `objectid`, `primaryimageurl`, `title`, `people`, `dated`, and `creditline` fields, plus classification, culture, medium, technique, numeric dates, a museum object-page link, and any supplied copyright text. Creator names come from `people`; `provenance` is ownership history and is not used as the artist. IIIF's artist descriptions are preserved, including uncertainty marks. Refresh output is limited to these public fields.

Legacy JSON arrays and objects keyed by record ID are still readable. Null records and records without a usable image URL are skipped. A `baseimageurl` can supply a IIIF rendition when the primary URL is missing. HTTP image URLs are upgraded to HTTPS; active-content schemes and credential-bearing URLs are rejected. Root-relative image paths are supported. Unknown catalog schema versions are rejected. The viewer revalidates the catalog on load/retry, and navigation uses its validated length.

Only public configuration belongs in `VITE_*` variables: Vite includes these values in browser code. Cross-origin endpoints must permit browser reads through CORS. Never set `VITE_HARVARD_API_KEY` or put a key in `VITE_IMAGES_URL`.

## Refresh the Harvard catalog

Fetch a fresh selection using the locally configured Harvard key:

```powershell
npm run refresh:catalog:api
npm run refresh:catalog:api -- --limit 200
```

The Node commands, including the local dev/preview service, load `HARVARD_API_KEY` from the optional, Git-ignored `.env.harvard` file in the repository root. The file is already configured in this local checkout. It is outside `public/`; the build command does not load it, and the key is excluded from browser code. A shell `HARVARD_API_KEY` takes precedence. On another machine, create `.env.harvard` locally with `HARVARD_API_KEY=your-key`, or use the shell setup below. Do not commit or share the key file.

Refresh the existing selection without a key:

```powershell
npm run refresh:catalog
```

This reads the existing Harvard object IDs and retrieves their current public [IIIF manifests](https://github.com/harvardartmuseums/api-docs#images). It updates metadata and requests images in a 1600×1600 bounding box (Harvard's server may round dimensions by a pixel). To replace the selection with specific Harvard objects, supply their museum object IDs:

```powershell
npm run refresh:catalog -- --ids 299843,230941,231940,227751
```

To discover a larger set of paintings, use Harvard's [collection API](https://github.com/harvardartmuseums/api-docs#access-to-the-api), which requires your own API key. In PowerShell 7:

```powershell
$env:HARVARD_API_KEY = Read-Host 'Harvard API key' -MaskInput
npm run refresh:catalog -- --source api --limit 100
Remove-Item Env:HARVARD_API_KEY
```

API mode replaces the selection with up to `--limit` unique paintings that have usable image URLs (default 100, maximum 1000). It uses stable object-ID ordering, requests pages of 100, skips invalid/image-less records, removes duplicate IDs, stops at the requested limit or last page, and aborts after 100 pages. A later default refresh updates that selected set through IIIF; use API mode again to rediscover the selection. The key is read only from the Node process's environment (including the local `.env.harvard` file), never from a `VITE_*` variable or a browser request. `.env.local` is for Vite configuration and is not loaded by this command.

An existing Harvard API response, record array, or version 1 catalog can also be imported without networking:

```powershell
npm run refresh:catalog -- --input response.json
npm run refresh:catalog -- --source api --limit 100 --output imports/review-catalog.json
```

Create the output directory first when using a custom path. `--output` defaults to this repository's `public/gallery.json`, regardless of the caller's current directory. Relative input/output paths are resolved from the working directory.

Refresh behavior:

- Every selected IIIF manifest, or every required API page, must succeed before publishing. Empty results, malformed JSON, invalid pagination, HTTP failures (including rate limits), and 15-second request/body timeouts fail the refresh. The command exits nonzero and keeps the current catalog.
- A successful refresh saves the exact previous file as `output/gallery.json.bak`, outside the served `public/` directory, then publishes complete JSON using a temporary file and same-directory rename. The default backup and temporary files are ignored by Git. A custom `--output` keeps its backup beside that output as `.bak`; use a directory outside `public/` for review exports. Review the catalog diff before any later publication.
- A lock prevents two refreshes from overwriting each other. If the process is forcibly terminated, the next invocation may report a stale `.lock`. Confirm no refresh is running before removing that lock and retrying. An interrupted write can leave a disposable `.tmp` beside the catalog; the original catalog remains intact until publication.
- Provider response bodies and secret-bearing request URLs are not logged. Requests use fixed Harvard endpoints, do not follow API redirects or provider-supplied pagination URLs, and make no remote writes.

For rollback in PowerShell, with no refresh running: `Copy-Item output/gallery.json.bak public/gallery.json -Force`. Refreshing changes source data locally. When no interactive selection overrides it, reload the dev viewer to see it; for the production preview, run `npm run build` again after the CLI refresh completes. Interactive builds appear immediately and survive reload without rebuilding Vite. The slideshow does not poll for file changes. Nothing is uploaded or scheduled automatically.

## Playback and accessibility

- Every valid record is reachable. Next/Previous wrap in sequential mode. Shuffle shows each record once per pass and avoids an immediate repeat between passes when there are multiple works. Previous retraces viewing history, and Next retraces that history before drawing another unseen work. The latest 1000 history entries are retained. Explicit thumbnail selections can revisit a work; a gallery change or shuffle toggle starts a new pass.
- The timer changes immediately and restarts after manual navigation. Rotation waits for image loading and pauses while a dialog is open, the tab is hidden, or playback is paused.
- Requests and individual images have a 15-second timeout. Broken images are skipped; empty/unavailable galleries show a retry action and a sample-gallery option. Timers and requests are cleaned up on unmount.
- Buttons work with keyboard and touch. Native dialogs support Escape, constrain focus, and restore focus to their trigger. Inputs have labels, text stays readable on mobile, and buttons have at least 44×44 CSS-pixel targets.
- Reduced-motion preference starts autoplay paused. Settings can still be changed, and Resume explicitly enables rotation.

## Local image import/export

The older **local JSON export command** remains available for reviewing a raw Harvard batch separately from the published catalog. It processes all supplied records, including the first and last, handles short/malformed batches, preserves source metadata, and never writes to Firebase. Existing output files are not overwritten. Use `refresh:catalog` above for normal catalog maintenance.

From an existing Harvard response (`{ "records": [...] }`) or array:

```powershell
npm run import:images -- --input response.json --output gallery.json
```

To fetch ten paintings from Harvard, configure `.env.harvard` (already configured in this checkout) or set `HARVARD_API_KEY` in the shell, and omit `--input`:

```powershell
$env:HARVARD_API_KEY = 'your-key'
npm run import:images -- --output gallery.json
Remove-Item Env:HARVARD_API_KEY
```

The key is used only by Node and is never bundled into the viewer. The command performs one read request and writes the reviewed dataset locally. It reports provider failures without logging the secret URL. No upload/deployment command is included. Use `--help` for syntax.

## Verification

```powershell
npx playwright install chromium firefox webkit  # Once per Playwright browser version
npm run check                                 # Lint, coverage, build, browser tests
npm audit                                     # Entire locked dependency tree
```

Individual commands: `npm test`, `npm run test:watch`, `npm run test:coverage`, `npm run lint`, `npm run build`, `npm run test:e2e`. Browser tests serve the existing `build/`, so build before running them independently. The test server chooses a free loopback port and refuses to reuse another process. Set `PRETTY_PICTURES_TEST_PORT` to select an explicit port.

Tests use controlled gallery responses, blocked external requests, virtual clocks, the actual built catalog, and bundled sample images. Browser builder tests run the real Node middleware with a controlled Harvard transport and isolated JSON storage per test. Service and refresh tests cover filter composition, artist identity, pagination, deduplication, malformed/empty/partial responses, key redaction, backup failures, concurrent instances, oversized requests, cancellation, corrupted presets, and JSON persistence. Shuffle tests cover repeated passes, viewing history, direct selections, and broken images. Browsers include Chromium, Firefox, WebKit, and mobile Chromium; keyboard focus order is intentionally skipped in the mobile project and covered in all desktop engines. Coverage excludes only the DOM bootstrap and tests. Ignored `coverage/`, `playwright-report/`, `test-results/`, and `output/` contain local evidence. See [verification details](docs/VERIFICATION.md).

## Build and dependencies

React 19 and Vite replace React 16/Create React App. Native `fetch` replaces Axios. Firebase CLI and unused browser import/debug code have been removed. `package-lock.json` pins the full dependency graph; use `npm ci` to reproduce it. ESLint's two minimatch dependencies are explicitly overridden to 11.0.5 to address [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Recheck these overrides when upgrading ESLint. jsdom 29.1.1 supports the documented Node range; jsdom 31 requires a newer Node 24 patch than the verification host.

`npm run build` generates `build/`, and `npm run preview` serves that build with the gallery service on loopback. `npm run build:pages` generates the independent static edition in `build-pages/`. No new runtime dependency was needed for either service or browser catalog support. The old Firebase Hosting configuration is retained for reference; the application no longer depends on Firebase Database. GitHub Pages publication uses `.github/workflows/pages.yml` and does not change the existing Firebase site or any domain/DNS configuration.

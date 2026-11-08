# Local first release verification — November 7, 2026

The original local release was developed on `codex/pretty-pictures-audit-fixes`, based on `ea9170ad848c9212f1931aa79699f1584deff199`. The owner subsequently authorized publishing it and selected GitHub Pages. The sections below retain the earlier local evidence; publication configuration and recovery are described in [DEPLOYMENT.md](DEPLOYMENT.md).

## GitHub Pages release checks

The Pages edition adds browser-side filtering of a separately published Harvard discovery catalog and browser-local preset/selection persistence. It retains the Node edition for live Harvard searches. The initial discovery refresh produced 1,457 unique artworks from 14 selections, without changing the original 100-painting starter catalog.

- Unit and service verification: **247 tests passed** in 12 files. Coverage: 96.03% statements, 95.13% branches, 96.38% functions, 96.76% lines. The standalone artifact checker is also executed directly outside Vitest coverage.
- Existing Node edition browser regression: **91 passed, 1 intentional mobile keyboard skip**.
- Static Pages edition: **28 passed**, across Chromium, Firefox, WebKit, and mobile Chromium. These tests serve static files under `/pretty-pictures/` and assert that the browser makes no gallery-service, Firebase Database, or authenticated Harvard requests.
- Static tests cover all five starter presets, combined filters and exact artist identity, preserving a selection across reload, preset CRUD, thumbnail pagination/direct selection, shuffle uniqueness, no-result preservation, blocked browser storage, mobile bounds, and eight additional accessibility scans.
- The discovery refresh is tested for complete publication, subject-tag preservation, deduplication, empty categories, provider errors, key contamination, backup failure, and concurrent refresh locks.
- The 12-file Pages artifact is checked for the correct project base path, a valid discovery catalog, and exclusion of the Harvard key, authenticated provider client, backups, temporary files, and private dotfiles.
- Publication uses the existing public repository and a workflow restricted to `master`. The Harvard key is configured as an encrypted Actions secret. A manually requested refresh retains the updated JSON in source after tests; it does not create a scheduled job.

Ignored evidence: `output/pages-unit.log`, `output/pages-local-regression.log`, `output/pages-browser-final.log`, `output/pages-discovery-refresh.log`, `output/pages-build.log`, `output/pages-configuration.json`, plus deployment and hosted-verification receipts. No Firebase or domain/DNS changes are part of this release.

## Current release: filters, presets, thumbnails, and shuffle

The first release adds a local Node service to the existing Vite dev and preview servers. It keeps the JSON catalog architecture, uses the already configured ignored Harvard key, and stores interactive selections and custom presets under `output/local-gallery/`. The original 100-painting `public/gallery.json` remains unchanged by this release. No new runtime dependency was needed.

| Check | Result |
| --- | --- |
| Complete `npm run check` | Passed |
| ESLint | Passed with zero warnings |
| Vitest | 225 tests passed in 10 files |
| Coverage | 98.73% statements, 97.06% branches, 98.34% functions, 99.49% lines |
| Vite production build | Passed |
| Playwright | 91 passed, 1 intentional mobile keyboard skip, 0 failures |
| Browser engines | Chromium, Firefox, WebKit, and mobile Chromium |
| Automated accessibility | 24 axe scans with zero violations for configured WCAG tags |
| All-package and runtime dependency audits | Zero reported vulnerabilities |
| Live Harvard vocabulary and artist discovery | 62 named art types; exact Claude Monet selection resolved |
| Live filtered galleries | All five starter presets, Monet paintings, mixed paintings/drawings, and Japanese woodcuts returned viewable artwork |
| Unmocked browser workflow | Built and reopened a 12-work Japanese print gallery; all 12 full images and 12 small IIIF thumbnails decoded |
| Live preset persistence | Saved a named preset, reopened it after reload, verified filters, and deleted it in isolated smoke-test storage |
| Credential isolation | Local key file ignored; zero matches in public/build/source/test/docs; no browser collection-API or credential-bearing requests |
| Source data preservation | Live checks verified `public/gallery.json` remained byte-for-byte unchanged |
| Standard local startup | Passed with the normal Vite/Node command; Harvard configured, 100 unique starter images, three private env-file URL forms blocked |

The live checks requested eight works per search. Painting discoveries, landscapes, nineteenth-century Japanese prints, watercolors, photography, Monet paintings, and mixed paintings/drawings each returned eight. The narrower Japanese woodcut search returned one viewable work from four matches; three lacked usable image data. For applicable filters, assertions checked the returned classification, culture, medium, technique, date overlap, and exact creator ID. Those are observed results from this run, not guaranteed future collection counts.

Automated service tests use real loopback HTTP requests with a controlled Harvard transport and temporary JSON storage. They verify filter validation and query escaping, artist disambiguation/creator roles, stable-seed pagination, duplicate object/image removal, no-result and provider-error preservation, request limits, cancellation, timeouts, origin/host restrictions, key redaction, atomic backup/publication, and mutation serialization across independent service instances. Named-preset coverage includes save/update/delete, reserved names, limits, invalid JSON and malformed records, and backup recovery errors. Tests also cover a thumbnail page becoming invalid when a failed image is removed.

Browser builder tests exercise the actual Node middleware with isolated storage per test. They verify combined filters, creating and reopening generated galleries, preset CRUD across reload, thumbnail pagination/search/direct selection, successive shuffle passes without repeats, Previous/Next history, failed/empty searches, and cancellation. Earlier slideshow, timer, 100-record catalog, fallback, keyboard, and image-failure tests remain in the complete suite. The mobile keyboard-order case remains intentionally skipped and covered in all three desktop engines. Builder layouts were checked at 320, 390, and 1280 CSS pixels; prior viewer coverage also includes 600 and 768 pixels. Automated accessibility scans are evidence of these checks, not a full screen-reader conformance certification.

Live evidence was gathered through an isolated Node preview service using the actual local Harvard key. No image bytes or Harvard responses were mocked. The 12 thumbnails decoded within a 320×320 bounding box (allowing a one-pixel server rounding tolerance). Desktop and mobile screenshots were visually inspected. Provider access remained in Node; the browser received no key, made no authenticated collection-API request, and reported no uncaught errors. Generated galleries, their backups, and preset files were checked for credential contamination. Smoke-test files are separate from normal `output/local-gallery/` user storage.

Current ignored evidence:

- `output/first-release-final-check.log`: complete lint, coverage, build, and browser suite.
- `output/first-release-dependency-audit.json`, `output/first-release-runtime-audit.json`.
- `output/live-first-release.mjs`, `output/first-release-live.log`, `output/first-release-live-results.json`.
- `output/first-release-live-builder.png`, `output/first-release-live-viewer.png`, `output/first-release-live-thumbnails.png`, `output/first-release-live-mobile.png`.
- `output/check-harvard-key-isolation.mjs`, `output/harvard-key-isolation.json`.
- `output/check-release-startup.mjs`, `output/first-release-startup.json`.
- `coverage/coverage-summary.json`, `playwright-report/`, `test-results/`, and `output/e2e-results.json`.

**Operational limits:** The interactive builder and preset saves require the local Node service; a static deployment supports the saved catalog, browser, and playback only. Remote artwork images still require internet access. Filters depend on museum metadata and image availability. Searches stop at 500 selected artworks, 20 provider pages, or the configured timeout. Normal saves retain one backup; a hard-killed process may leave a lock requiring inspection/removal. A completed save may win a race with cancellation. CLI refreshes update the starter catalog, while the local service serves a saved interactive selection when one exists. See the README for storage, recovery, and static-export instructions. Nothing was committed, pushed, deployed, or scheduled.

The sections below retain historical verification from the preceding catalog and repair stages.

## Earlier JSON catalog results

The application defaults to `public/gallery.json` and has no Firebase Database dependency. The catalog now contains **100 paintings fetched from Harvard's authenticated collection API**. The user's original key was recovered from their Harvard-issued email, validated by a successful API refresh, and stored in the Git-ignored local `.env.harvard` file. `npm run refresh:catalog:api` loads that file automatically. The refresh skipped seven unusable records and found no duplicate IDs; the original four-painting starter catalog was preserved in `output/gallery.json.bak`. The rebuilt site contains no credential file, catalog backup, lock, or temporary file.

| Check | Result |
| --- | --- |
| Complete `npm run check` | Passed |
| ESLint | Passed with zero warnings |
| Vitest | 130 tests passed in 5 files |
| Coverage | 98.24% statements, 98.02% branches, 97.33% functions, 99.21% lines |
| Vite production build | Passed; catalog copied into `build/gallery.json` |
| Playwright | 63 passed, 1 intentional mobile keyboard skip, 0 failures |
| Automated accessibility | 16 axe scans, zero violations for configured tags |
| All-package and runtime dependency audits | 0 reported vulnerabilities in either audit |
| Live Harvard API refresh | Passed using the recovered key; 100 artworks written, 7 unusable records skipped, 0 duplicate IDs |
| Earlier live Harvard IIIF refresh | Passed for the four-object starter selection |
| Unmocked production viewer | Local JSON HTTP 200; all 100 actual Harvard images decoded; only GET requests; zero uncaught errors |
| Credential isolation | `.env.harvard` ignored by Git; 53 public/build/source/test/documentation files scanned with zero key matches |
| Missing-key CLI invocation | Exit 1; catalog SHA-256 unchanged; lock removed |
| Git whitespace check | Passed |

Refresh coverage includes versioned catalog parsing, field whitelisting, creator/credit preservation, uncertain attribution, IIIF image URLs, API pagination and stable sort order, request limits, deduplication, invalid records, partial page failures, HTTP 401/429/500, malformed JSON, timeouts/abort signaling, missing keys, secret redaction, empty output rejection, local imports, concurrent-process lock rejection, failed backup publication, filesystem errors, temporary-file cleanup, and atomic file replacement. An integration test serves newly refreshed JSON over a real loopback HTTP server and reads it through the viewer's `loadArtworks` function before and after replacement. New subprocess tests exercise the actual CLI with a private env file, verify that shell configuration overrides the file, confirm key exclusion from stdout/stderr/catalog JSON, and preserve offline imports when the optional env file is absent. Those tests use fake keys and controlled provider responses.

Each browser project serves the actual built catalog and checks all 100 entries and their credits, with remote image bytes mocked for determinism. That test's timeout scales with catalog size so the full catalog remains covered. A separate unmocked Chromium run loaded and decoded all 100 actual Harvard images in the slideshow, checked each entry's metadata, and captured desktop/mobile screenshots. Screenshots were visually inspected. No browser request reached Firebase, the Harvard collection API, or a URL carrying an API key. The five bundled sample images remain available for offline fallback.

**Limitations:** Harvard image availability still depends on the remote image service; the JSON catalog stores metadata and image URLs, not downloaded full-size images. Refreshes update source files, so production previews need rebuilding. The running viewer picks up changes on reload/retry, not through polling. The API key is local to this checkout and must be configured separately on another machine. Local verification does not establish deployment behavior. Dependency audit results below are from the immediately preceding catalog stage; no dependencies or lockfile entries changed during key setup.

Current ignored evidence:

- `output/harvard-api-final-check.log` records the final 130-test / 63-browser-check run.
- `output/harvard-api-live-smoke.mjs`, `output/harvard-api-live-smoke.json` record the live 100-image viewer run.
- `output/harvard-api-live-desktop.png`, `output/harvard-api-live-mobile.png`, `output/harvard-api-live-mobile-details.png`.
- `output/check-harvard-key-isolation.mjs`, `output/harvard-key-isolation.json` verify credential isolation without printing the key.
- `output/catalog-final-check.log`, `output/catalog-browser-check.log`, `output/e2e-results.json`.
- `output/catalog-dependency-audit.json`, `output/catalog-runtime-audit.json`.
- `output/catalog-live-smoke.mjs`, `output/catalog-live-smoke.json`.
- `output/catalog-live-desktop.png`, `output/catalog-live-mobile.png`, `output/catalog-live-mobile-details.png`.
- `output/catalog-missing-key.log`, `coverage/coverage-summary.json`, `playwright-report/`, and `test-results/`.
- `output/gallery.json.bak`, containing the catalog before the most recent live refresh. The backup lives outside `public/` so it is not copied into the build.

No new dependencies were needed for catalog support. The earlier clean installation and lockfile verification below remain applicable. The sections below record the preceding repair stage and the original Firebase outage; they are historical evidence, not the application's current data source.

## Earlier repair results

Environment: Windows, Node 24.14.0, npm 11.9.0. Dependencies were installed from scratch and then reproduced with `npm ci`. The complete final `npm run check` passed.

| Check | Result |
| --- | --- |
| Clean locked installation | Passed; no OpenSSL flags or private configuration module required |
| ESLint | Passed with zero warnings |
| Vitest | 77 tests passed in 4 files |
| Coverage | 98.47% statements, 97.57% branches, 98.18% functions, 99.32% lines |
| Vite production build | Passed; existing `build/` hosting directory retained |
| Playwright | 59 passed, 1 intentional mobile keyboard skip, 0 failures |
| Dependency audit, all packages | 0 reported vulnerabilities |
| Dependency audit, runtime packages | 0 reported vulnerabilities |
| Git whitespace check | Passed |

Coverage includes application components, state transitions, data normalization/loading, sample-gallery construction, and the local import command. It excludes the DOM bootstrap and test files. The remaining uncovered command branch is the top-level CLI error wrapper; that path was also invoked directly without credentials and correctly exited without creating an output file. Coverage percentages describe exercised code, not proof of absence of all defects.

## Behavior covered

- Sequential forward/back navigation, wrapping, the final record, random selection, repeated selections, and distinct records that share an image URL.
- Changed timer values, manual timer resets, pause/resume, background-tab suspension, dialog suspension, image readiness, reduced-motion startup, and timer cleanup on unmount.
- Initial loading, cancellation, stale responses, request timeouts, invalid JSON, denied/offline requests, empty/sparse/single-image galleries, broken and stalled images, retries, and local sample fallback.
- Metadata containing executable-looking HTML remains plain text. Artist attribution uses creators instead of ownership provenance. Unsafe image URL schemes and URLs containing credentials are rejected.
- Keyboard dismissal and operation of native dialogs, focus restoration and confinement, form labels, readable mobile text, and minimum 44×44 button targets.
- Importing ten records includes both endpoints; short/malformed batches are handled. Existing files cannot be silently overwritten. Offline import performs no network request. Network import performs one Harvard GET and writes only a local file; provider errors do not disclose the API key.

## Browser and layout verification

The production build was tested in Playwright Chromium, Firefox, WebKit, and a Pixel 7/mobile Chromium configuration. The mobile keyboard-order case is intentionally skipped; all three desktop engines cover it. Browser tests intercept gallery requests and block unconfigured external destinations, assert read-only request methods, and fail on uncaught page errors. Controlled clocks check timing; image requests use both test SVGs and all five original repository photographs/paintings.

Sixteen axe scans (welcome, viewer, settings, details in each browser project) reported zero violations for the configured WCAG 2 A/AA, 2.1 A/AA, and 2.2 AA tags. This is automated accessibility evidence, not a screen-reader conformance certification. Responsive checks covered 320, 390, 600, 768, and 1280 CSS-pixel widths in all four projects, plus increased text spacing at 320px. Artwork stays between the header and footer without controls obscuring its bounds. Desktop and mobile screenshots were visually inspected.

An initially intermittent WebKit timing test advanced the frozen clock before React's passive scheduling effect ran. The test now observes actual timeout scheduling and the changed image before advancing time; the exact five-second boundary remains asserted. Ten repeated WebKit runs passed, followed by the complete browser suite.

## Earlier Firebase service check

A separate, unmocked Chromium run served the local production build and requested the original Firebase gallery. Firebase returned HTTP **423** because the database is deactivated. The app displayed its recoverable error and successfully switched to the bundled sample artwork. The run observed only GET requests and no uncaught JavaScript errors. No Firebase administration or write-capability test was attempted.

At that stage, the application could not restore the deactivated Firebase service. The JSON catalog migration above has since replaced that dependency. The local sample images have no accompanying catalog metadata in the repository; missing artist/date/credit values remain explicitly unknown.

## Evidence and reproduction

Run `npm ci`, install the Playwright browsers as described in the README, then run `npm run check` and `npm audit`. The test server chooses a free loopback port, closes when testing ends, and does not reuse or stop other processes.

Ignored local artifacts:

- `output/clean-install.log`, `output/final-check.log`, `output/e2e-results.json`.
- `output/dependency-audit.json`, `output/runtime-dependency-audit.json`.
- `coverage/coverage-summary.json` and the HTML coverage report.
- `playwright-report/index.html` and `test-results/` screenshots.
- `output/real-source-smoke.json`, `output/real-source-desktop.png`, `output/real-source-mobile.png`, and `output/real-source-mobile-settings.png`.

React 19.3.1, Vite 8.3.6, Vitest 5.1.0, and Playwright 1.65.0 are locked in the manifest. ESLint 10.14.0 uses two scoped minimatch 11.0.5 overrides for the upstream advisory documented in the README. These overrides passed lint and installation verification; revisit them during future dependency upgrades. No dependency-audit findings were suppressed.

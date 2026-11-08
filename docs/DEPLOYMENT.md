# GitHub Pages deployment

The owner authorized deployment, then selected GitHub Pages instead of Firebase. The existing public repository is `BlueEyes360/pretty-pictures`, with source branch `master`. The previous source head is `ea9170ad848c9212f1931aa79699f1584deff199`. There was no Pages site configured for this repository before this release. The existing Firebase site and other portfolio sites are not changed.

## What is published

`npm run build:pages` produces `build-pages/` using `/pretty-pictures/` as the asset/catalog base. The release includes the original 100-painting starter catalog and a separate discovery catalog, initially 1,457 unique artworks drawn from 14 authenticated Harvard selections. Only static build files are uploaded to Pages. The Node service, local JSON saves, backups, test evidence, and `.env.harvard` are excluded.

The hosted builder filters the published catalog. Presets and the user's selected object IDs are stored in that browser, under a key scoped to the project path. The local `npm start` edition continues to use Node for live Harvard discovery and file-based persistence. Pages does not provide a Node runtime or live authenticated Harvard API proxy.

## Release workflow

`.github/workflows/pages.yml` publishes pushes to `master` and supports manual runs on that branch. It installs the locked dependencies on Node 24.14.0, runs lint and unit/coverage checks, builds the Pages artifact, checks private-data exclusion and URL paths, and runs Chromium, Firefox, WebKit, and mobile Chromium Pages tests before uploading and deploying. Third-party action references are pinned to verified commit SHAs. Concurrent releases are serialized.

The repository's `HARVARD_API_KEY` Actions secret is encrypted with GitHub's repository public key. It is used only by the refresh step and by the artifact-leak check. It is not a `VITE_*` variable, build input, workflow argument, or committed file. The secret value is never logged.

To request fresh artwork, open **Actions → Publish Pretty Pictures → Run workflow**, select `master`, and enable the refresh option. A successful refresh is tested, committed back to `master`, and deployed in the same run. The push uses GitHub's workflow token and does not recursively trigger another deployment. If another change reaches `master` before that commit can be pushed, the refresh run fails safely instead of force-pushing. There is no scheduled job.

## Verification and recovery

Local release checks include `npm run check`, `npm run build:pages`, `node --env-file-if-exists=.env.harvard scripts/check-pages-artifact.mjs`, and `npm run test:pages`. Check the exact deployment's Actions run before assuming publication succeeded. Verify the live document and asset hashes, gallery and discovery JSON, HTTPS, filter/preset/thumbnail/shuffle behavior, and the absence of collection API requests from the browser.

After a later release, revert the relevant source commit on `master` and push the revert to rebuild/deploy the preceding version. Preserve history; do not force-push. For a bad data refresh, revert the `Refresh Harvard discovery catalog` commit and publish normally, leaving the refresh option off. Because this is the first Pages release, the pre-release source revision has no Pages workflow; reverting the entire first release would require explicitly disabling the newly created Pages site or retaining the last known-good deployment.

Local records under ignored `output/` include pre-release repo metadata, build/test logs, the Pages artifact checks, publication receipts, and hosted verification results. Public deployment commit and run links are recorded in the completion message.

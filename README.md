# ONE NAN — separate public website

This branch is a standalone third public website. It does not deploy or modify the original reader or administrator Workers. It has no KV binding and no administrator/publishing API.

All 22 photos, names, alternate names, communities and notes have been replaced with demonstration data. Names mix Korean and English and are fictional; photos are online photo samples with sources in public-site/PHOTO-SOURCES.txt. Activity years and interface design are preserved. Photos are embedded so the page does not depend on external image hosts. Photo copyrights remain with their respective owners; no new license is asserted.

## Cloudflare deployment

Create a NEW Worker called `one-nan-public`, connect `wintaftjuly/1`, select production branch `public-portfolio`, leave the build command blank and set deploy command to `npx wrangler deploy`. Root directory is `/`. Do not change either existing Worker. The root wrangler.jsonc on this branch targets only one-nan-public and serves ./public-site.

Local preview: `npx wrangler dev`. Deploy: `npx wrangler deploy`.

The public site has no registration/editing UI. Changes to the demonstration data are made in public-site/archive.json and the corresponding embedded BUNDLED_ARCHIVE in index.html. The original data and main branch remain unchanged.

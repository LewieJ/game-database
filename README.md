# Game Database (gdb.gg)

Static site for **gdb.gg**: home (`index.html`), **Marathon** subsite (`marathon/`), other game folders present but not linked from the global nav; shared `assets/`.

## Layout

- **`/`** — Landing: hero, supported titles (Marathon + Fortnite placeholder), master nav, footer. SEO: canonical `https://gdb.gg/`, Open Graph + Twitter use `assets/og-default.png` (1200×630).
- **`/marathon/`** — Marathon subsite (weapons, skins, SSG build scripts under `marathon/build/`).

## Sitemap

Root **`sitemap.xml`** lists **`https://gdb.gg/`** and **`https://gdb.gg/marathon/...`** routes only (no Fortnite, hub, or other subsites). Regenerate after adding Marathon HTML:

```bash
npm run build:sitemap
```

## GitHub Pages + custom domain

1. Push this repo to GitHub.
2. **Settings → Pages**: Source **Deploy from branch**, branch **main**, folder **/ (root)**.
3. **Settings → Pages → Custom domain**: `gdb.gg`.
4. At your DNS provider, add GitHub Pages records (see [GitHub: custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).
5. After DNS propagates, enable **Enforce HTTPS** in Pages settings.

Use **apex** `https://gdb.gg` as canonical; if you use **www**, redirect to apex and keep `Sitemap:` and meta tags on one host.

The `CNAME` file in this repo should match your primary custom domain (`gdb.gg`).

## Search verification

In `index.html`, uncomment and fill **`google-site-verification`** and **`msvalidate.01`** after claiming the property in Google Search Console and Bing Webmaster Tools.

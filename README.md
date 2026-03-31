# Game Database (gdb.gg)

Static site for **gdb.gg**: loading-style home (`index.html`), optional games hub (`hub.html`), and subsites copied from the prior RNK stack (Marathon hub, Steam, Twitch, Xbox, PlayStation, Fortnite placeholders, shared `assets/`).

## Layout

- **`/`** — Coming-soon landing (unchanged hero) + master nav + footer.
- **`/hub.html`** — Full “explore” page (games grid, features, about) with the same nav.
- **`/marathon/`** — Marathon subsite (weapons, skins, SSG build scripts under `marathon/build/`).

## GitHub Pages + custom domain

1. Push this repo to GitHub.
2. **Settings → Pages**: Source **Deploy from branch**, branch **main**, folder **/ (root)**.
3. **Settings → Pages → Custom domain**: `gdb.gg`.
4. At your DNS provider, add GitHub Pages records (see [GitHub: custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)).
5. After DNS propagates, enable **Enforce HTTPS** in Pages settings.

The `CNAME` file in this repo should match your primary custom domain (`gdb.gg`).

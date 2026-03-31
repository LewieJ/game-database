#!/usr/bin/env python3
"""Optional: recreate repo-root /weapons/<slug>/ redirect stubs (prefer root _redirects).

The main Marathon weapons tree lives under marathon/weapons/. Root stubs were removed
in favor of _redirects for Netlify/Cloudflare. Run this only if you need static redirects
without host-level rules.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARATHON_WEAPONS = ROOT / "marathon" / "weapons"
OUT = ROOT / "weapons"


def redirect_page(target_path: str) -> str:
    # target_path like /marathon/weapons/b33-volley-rifle/
    js_url = json.dumps(target_path)
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url={target_path}">
  <link rel="canonical" href="{target_path}">
  <title>Redirecting…</title>
  <script>location.replace({js_url});</script>
</head>
<body>
  <p>Moved to <a href="{target_path}">{target_path}</a>.</p>
</body>
</html>
"""


def main() -> None:
    if not MARATHON_WEAPONS.is_dir():
        raise SystemExit(f"Missing {MARATHON_WEAPONS}")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(
        redirect_page("/marathon/weapons/"),
        encoding="utf-8",
    )

    n = 0
    for d in sorted(MARATHON_WEAPONS.iterdir()):
        if not d.is_dir():
            continue
        if not (d / "index.html").is_file():
            continue
        slug = d.name
        dest = OUT / slug / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(
            redirect_page(f"/marathon/weapons/{slug}/"),
            encoding="utf-8",
        )
        n += 1

    print(f"Wrote {n} weapon redirect stubs under {OUT} plus weapons/index.html.")


if __name__ == "__main__":
    main()

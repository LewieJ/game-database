#!/usr/bin/env python3
"""Create repo-root /runners/<slug>/ pages that redirect to /marathon/runners/<slug>/."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARATHON_RUNNERS = ROOT / "marathon" / "runners"
OUT = ROOT / "runners"


def redirect_page(target_path: str) -> str:
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
    if not MARATHON_RUNNERS.is_dir():
        raise SystemExit(f"Missing {MARATHON_RUNNERS}")

    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "index.html").write_text(
        redirect_page("/marathon/runners/"),
        encoding="utf-8",
    )

    n = 0
    for d in sorted(MARATHON_RUNNERS.iterdir()):
        if not d.is_dir():
            continue
        if not (d / "index.html").is_file():
            continue
        slug = d.name
        dest = OUT / slug / "index.html"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(
            redirect_page(f"/marathon/runners/{slug}/"),
            encoding="utf-8",
        )
        n += 1

    print(f"Wrote {n} runner redirect stubs under {OUT} plus runners/index.html.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Overwrite marathon/*.html from a local marathonfrontend checkout, then run
rnk_marathon_migrate transforms (ads/SEO strip, /marathon prefix, RNK chrome).

Preserves hand-maintained pages under marathon/ (see SKIP_RELATIVE).

Usage (repo root):
  python tools/rnk_marathon_resync_from_frontend.py
  python tools/rnk_marathon_resync_from_frontend.py "D:\\path\\to\\marathonfrontend"
"""
from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARATHON = ROOT / "marathon"
DEFAULT_FRONTEND = ROOT.parent / "marathonfrontend"

# Do not overwrite — keep RNK-specific curated files.
SKIP_RELATIVE = frozenset(
    {
        Path("index.html"),
        Path("weapons/index.html"),
    }
)


def main() -> None:
    frontend = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_FRONTEND
    if not frontend.is_dir():
        raise SystemExit(f"MarathonDB frontend folder not found: {frontend}")

    copied = 0
    skipped = 0
    for dest in MARATHON.rglob("*.html"):
        rel = dest.relative_to(MARATHON)
        if rel in SKIP_RELATIVE:
            skipped += 1
            continue
        src = frontend / rel
        if not src.is_file():
            continue
        shutil.copy2(src, dest)
        copied += 1

    print(f"Resynced {copied} HTML files from {frontend} (skipped {skipped} protected paths).")

    migrate_script = ROOT / "tools" / "rnk_marathon_migrate.py"
    subprocess.run([sys.executable, str(migrate_script)], check=True, cwd=ROOT)
    print("Done.")


if __name__ == "__main__":
    main()

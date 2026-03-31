#!/usr/bin/env python3
"""
One-off migration: strip MarathonDB ads + SEO, prefix paths with /marathon for gdb.gg hosting.
Run from repo root: python tools/rnk_marathon_migrate.py
"""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MARATHON = ROOT / "marathon"
PREFIX = "/marathon"

RNK_RAIL = """<div class="rnk-site-rail"><a href="/marathon/" class="rnk-site-rail__brand">gdb.gg</a><span class="rnk-site-rail__sep" aria-hidden="true">/</span><span class="rnk-site-rail__here">Marathon</span></div>"""

RNK_LINK = (
    '<link rel="stylesheet" href="/marathon/css/rnk-theme.css">'
)


def dedupe_marathon_prefix(text: str) -> str:
    while "/marathon/marathon/" in text:
        text = text.replace("/marathon/marathon/", "/marathon/")
    return text


def strip_ads(html: str) -> str:
    html = re.sub(
        r"<!--\s*Google AdSense\s*-->[\s\S]*?<script[^>]*googlesyndication\.com[^>]*></script>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"<script[^>]*googlesyndication\.com[^>]*></script>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"<ins[^>]*class=\"adsbygoogle\"[^>]*>[\s\S]*?</ins>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    # Must not use a leading [\s\S]*? before (adsbygoogle — that spans past </script>
    # and matches the head ld+json block, deleting most of the page.
    html = re.sub(
        r"<script[^>]*>\s*try\s*\{\s*\(adsbygoogle[\s\S]*?</script>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    return html


def strip_seo(html: str) -> str:
    html = re.sub(
        r"<link\s+rel=[\"']canonical[\"'][^>]*>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"<meta\s+[^>]*property=[\"']og:[^\"']+[\"'][^>]*>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"<meta\s+[^>]*name=[\"']twitter:[^\"']+[\"'][^>]*>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(r"<meta\s+name=[\"']keywords[\"'][^>]*>", "", html, flags=re.IGNORECASE)
    html = re.sub(
        r"<meta\s+name=[\"']description[\"'][^>]*>", "", html, flags=re.IGNORECASE
    )
    html = re.sub(
        r"<meta\s+name=[\"']author[\"'][^>]*>", "", html, flags=re.IGNORECASE
    )
    html = re.sub(
        r"<meta\s+name=[\"']robots[\"'][^>]*>", "", html, flags=re.IGNORECASE
    )
    html = re.sub(
        r"<meta\s+name=[\"']msvalidate\.01[\"'][^>]*>", "", html, flags=re.IGNORECASE
    )
    html = re.sub(
        r"<script[^>]*type=[\"']application/ld\+json[\"'][^>]*>[\s\S]*?</script>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"<script[^>]*id=[\"']structured-data[\"'][^>]*>[\s\S]*?</script>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"<script[^>]*id=[\"']breadcrumb-data[\"'][^>]*>[\s\S]*?</script>",
        "",
        html,
        flags=re.IGNORECASE,
    )
    return html


def inject_robots_and_rnk(html: str) -> str:
    if "rnk-theme.css" not in html:
        html = re.sub(
            r"(</head>)",
            "    " + RNK_LINK + r"\n\1",
            html,
            count=1,
            flags=re.IGNORECASE,
        )
    if 'name="robots" content="noindex' not in html:
        html = re.sub(
            r"(<head[^>]*>)",
            r'\1\n    <meta name="robots" content="noindex,nofollow">',
            html,
            count=1,
            flags=re.IGNORECASE,
        )
    if "rnk-site-rail" not in html:
        html = re.sub(
            r"(<body[^>]*>)",
            r"\1\n" + RNK_RAIL + "\n",
            html,
            count=1,
            flags=re.IGNORECASE,
        )
    return html


def apply_rnk_chrome(html: str) -> str:
    """Shared MarathonDB → gdb.gg shell tweaks (nav, footer, notices, title)."""
    html = re.sub(
        r'(?:\s*<!-- Feedback Notice Banner -->\s*)?'
        r'<div class="site-notice"[^>]*id="siteNoticeBanner"[\s\S]*?</script>\s*',
        "",
        html,
        flags=re.IGNORECASE,
    )
    html = html.replace(
        '<a href="/" class="rnk-site-rail__brand">',
        '<a href="/marathon/" class="rnk-site-rail__brand">',
    )
    html = re.sub(
        r'(<img src="/marathon/Icon\.png" alt=")MarathonDB(" class="logo-icon")',
        r"\1\2",
        html,
        count=0,
    )
    html = html.replace('alt="MarathonDB"', 'alt=""')
    html = html.replace(
        "<span>MARATHON<span class=\"logo-accent\">DB</span></span>",
        "<span>Rnk<span class=\"logo-accent\">.</span>GG</span>",
    )
    html = re.sub(
        r'<span class="footer-logo">MARATHON</span>\s*<span class="footer-logo-sub">DATABASE</span>',
        '<span class="footer-logo">gdb.gg</span><span class="footer-logo-sub">Marathon</span>',
        html,
    )
    html = re.sub(
        r" \| MarathonDB</title>",
        " — gdb.gg</title>",
        html,
        flags=re.IGNORECASE,
    )
    return html


def prefix_html_attrs(html: str) -> str:
    def repl_attr(m: re.Match) -> str:
        attr, path = m.group(1), m.group(2)
        # Only skip when already under /marathon/ (not "/marathon-pc-..." etc.)
        if not path or path == "/marathon" or path.startswith("/marathon/"):
            return m.group(0)
        if path.startswith("http") or path.startswith("//") or path.startswith("data:"):
            return m.group(0)
        return f'{attr}="{PREFIX}{path}"'

    def repl_attr_sq(m: re.Match) -> str:
        attr, path = m.group(1), m.group(2)
        if not path or path == "/marathon" or path.startswith("/marathon/"):
            return m.group(0)
        if path.startswith("http") or path.startswith("//") or path.startswith("data:"):
            return m.group(0)
        return f"{attr}='{PREFIX}{path}'"

    html = re.sub(
        r'(href|src|action)="(/(?!marathon/)[^"]*)"',
        repl_attr,
        html,
        flags=re.IGNORECASE,
    )
    html = re.sub(
        r"(href|src|action)='(/(?!marathon/)[^']*)'",
        repl_attr_sq,
        html,
        flags=re.IGNORECASE,
    )
    return dedupe_marathon_prefix(html)


def prefix_css_urls(css: str) -> str:
    css = re.sub(
        r"url\(\s*(['\"]?)/(?!marathon/)([^)]+?)\s*\)",
        lambda m: f"url({m.group(1)}{PREFIX}/{m.group(2)}",
        css,
    )
    return dedupe_marathon_prefix(css)


def process_file(path: Path) -> None:
    raw = path.read_text(encoding="utf-8", errors="replace")
    ext = path.suffix.lower()
    if ext == ".html":
        text = raw
        text = strip_ads(text)
        text = strip_seo(text)
        text = prefix_html_attrs(text)
        text = inject_robots_and_rnk(text)
        text = apply_rnk_chrome(text)
        if text != raw:
            path.write_text(text, encoding="utf-8")
    elif ext == ".css":
        text = prefix_css_urls(raw)
        if text != raw:
            path.write_text(text, encoding="utf-8")


def main() -> None:
    if not MARATHON.is_dir():
        raise SystemExit(f"Missing {MARATHON}")
    for p in MARATHON.rglob("*"):
        # Do not rewrite .js — it breaks SVG `"/>` sequences and API path strings.
        if p.is_file() and p.suffix.lower() in {".html", ".css"}:
            if "node_modules" in p.parts:
                continue
            process_file(p)
    print("Done processing marathon HTML/CSS.")


if __name__ == "__main__":
    main()

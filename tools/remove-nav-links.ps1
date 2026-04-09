$marathonDir = "c:\Users\JYML9\Desktop\game-database\marathon"
$files = Get-ChildItem -Path $marathonDir -Recurse -Filter "*.html"
$count = 0

foreach ($f in $files) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    $original = $content

    # 1. Remove Destiny 2 cross-promo block (divider + label + link)
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        '(?s)\r?\n[ \t]+<div class="nav-dropdown-divider"></div>\r?\n[ \t]+<span class="nav-dropdown-label">Cross-Promotion</span>\r?\n[ \t]+<a href="/marathon/pages/cosmetics-destiny2"[^>]*>.*?</a>',
        ''
    )

    # 2. Remove News item from More dropdown nav
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        '(?s)\r?\n[ \t]+<a href="/marathon/news/" class="nav-dropdown-item">.*?</a>',
        ''
    )

    # 3. Remove News footer link line
    $content = [System.Text.RegularExpressions.Regex]::Replace(
        $content,
        '\r?\n[ \t]+<a href="/marathon/news/" class="footer-link">News</a>',
        ''
    )

    if ($content -ne $original) {
        [System.IO.File]::WriteAllText($f.FullName, $content)
        $count++
    }
}

Write-Host "Updated $count files"

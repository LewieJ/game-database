$root = "c:\Users\JYML9\Desktop\marathonfrontend"
$files = Get-ChildItem -Path $root -Recurse -Filter "index.html" | Where-Object { $_.FullName -ne "$root\index.html" -and $_.FullName -notlike "*\items\*" }
$mP = "(<a href=""/mods/"" class=""nav-link"">Mods</a>)(\r?\n)(\r?\n\s*<span class=""nav-divider""></span>)"
$mR = '$1$2                <a href="/items/" class="nav-link">Items</a>$2$3'
$sP = "(?s)(\r?\n)\s*<!-- Store dropdown \(Coming Soon\) -->\s*<div class=""nav-dropdown"">.*?</div>\s*</div>(\r?\n)\s*<span class=""nav-divider""></span>"
$sR = '$1                <span class="nav-divider"></span>'
$u=0;$s=0
foreach ($f in $files) {
    $raw=[IO.File]::ReadAllText($f.FullName);$orig=$raw
    if (-not ($raw.Contains('<a href="/items/" class="nav-link">Items</a>') -or $raw.Contains('<a href="/items/" class="nav-link active">Items</a>'))) {
        $raw=[regex]::Replace($raw,$mP,$mR)
    }
    $raw=[regex]::Replace($raw,$sP,$sR)
    if ($raw -ne $orig) {[IO.File]::WriteAllText($f.FullName,$raw);$u++} else {$s++}
}
Write-Host "Updated:$u Skipped:$s"

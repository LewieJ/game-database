/**
 * Strips duplicated hard-coded AdSense script blocks from marathon/build/ssg*.js.
 * Publisher ca-pub-1865737750178944 is the shared authorized seller for gdb.gg and related sites; prefer adsense-snippets.js + env for builds.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const buildDir = path.join(__dirname, '..', 'marathon', 'build');
/**
 * Exclusions: automated strip can break large template literals (modals, nested sections).
 * Edit ads in those files manually or use adsense-snippets.js + env RNK_ADSENSE_CLIENT.
 */
const SKIP = new Set(['ssg-runner-cores.js', 'ssg.js']);
const files = fs.readdirSync(buildDir).filter((f) => /^ssg.*\.js$/.test(f) && !SKIP.has(f));

function strip(content) {
    let s = content;

    const headPatterns = [
        /\r?\n\s*<!-- Google AdSense -->\r?\n\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-1865737750178944"\r?\n\s*crossorigin="anonymous"><\/script>/g,
        /\r?\n\s*<!-- Google AdSense -->\r?\n\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-1865737750178944"\s*crossorigin="anonymous"><\/script>/g,
        /\r?\n\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-1865737750178944"\s*crossorigin="anonymous"><\/script>/g,
        /\r?\n\s*<script async src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-3833585498203027"\s*crossorigin="anonymous"><\/script>/g,
    ];
    headPatterns.forEach((p) => {
        s = s.replace(p, '');
    });

    const insWithPush =
        /\r?\n\s*<ins class="adsbygoogle"[\s\S]*?<\/ins>\r?\n\s*<script>try\{\(adsbygoogle = window\.adsbygoogle \|\| \[\]\)\.push\(\{\}\)\}catch\(e\)\{\}<\/script>/g;
    let prev;
    do {
        prev = s;
        s = s.replace(insWithPush, '');
    } while (s !== prev);

    s = s.replace(/\r?\n\s*<ins class="adsbygoogle"[^>]*><\/ins>/g, '');

    return s;
}

for (const f of files) {
    const fp = path.join(buildDir, f);
    const before = fs.readFileSync(fp, 'utf8');
    const after = strip(before);
    if (after !== before) {
        fs.writeFileSync(fp, after);
        console.log('stripped:', f);
    }
}

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MARATHON = path.resolve(__dirname, "..", "marathon");
const NEEDLE = '<link rel="stylesheet" href="/marathon/css/rnk-theme.css">';
const INSERT = `  <script src="/marathon/js/unified-site-nav.js" defer></script>\n${NEEDLE}`;

let count = 0;
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (ent.name.endsWith(".html")) {
      let t = fs.readFileSync(p, "utf8");
      if (!t.includes("rnk-theme.css") || t.includes("unified-site-nav.js")) continue;
      if (!t.includes(NEEDLE)) continue;
      t = t.replace(NEEDLE, INSERT);
      fs.writeFileSync(p, t, "utf8");
      count++;
    }
  }
}
walk(MARATHON);
console.log("patch-marathon-unified-nav:", count, "files");

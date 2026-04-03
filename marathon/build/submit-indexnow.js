/**
 * IndexNow Submission Script
 * Notifies Bing (and other IndexNow-supporting search engines) about new/updated URLs.
 * 
 * Usage:
 *   node build/submit-indexnow.js                  — submits all URLs in the list below
 *   node build/submit-indexnow.js /news/my-article/ — submits a single URL
 * 
 * Run this after deploying new content or making significant page updates.
 */

const https = require('https');

const INDEXNOW_KEY = 'd86078e67f7c48eaaccd4c54ece9ab6b';
const HOST = 'marathondb.gg';
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

// Default URL list — update when publishing new content
const DEFAULT_URLS = [
  `https://${HOST}/`,
  `https://${HOST}/news/`,
  `https://${HOST}/news/marathon-rewards-pass-s1-update/`,
  `https://${HOST}/news/marathon-100k-concurrent-users-steam/`,
  `https://${HOST}/mods/`,
  `https://${HOST}/weapons/`,
  `https://${HOST}/runners/`,
  `https://${HOST}/cores/`,
  `https://${HOST}/implants/`,
  `https://${HOST}/items/`,
  `https://${HOST}/runner-skins/`,
  `https://${HOST}/weapon-skins/`,
];

function submitToIndexNow(urls) {
  const body = JSON.stringify({
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  });

  const options = {
    hostname: 'api.indexnow.org',
    path: '/marathon/IndexNow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    },
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 202) {
          console.log(`✓ IndexNow accepted ${urls.length} URL(s) — HTTP ${res.statusCode}`);
          resolve(res.statusCode);
        } else if (res.statusCode === 422) {
          console.error(`✗ IndexNow rejected submission (422 Unprocessable) — check that the key file is reachable at ${KEY_LOCATION}`);
          reject(new Error(`HTTP 422`));
        } else {
          console.error(`✗ Unexpected response: HTTP ${res.statusCode}\n${data}`);
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function main() {
  const arg = process.argv[2];
  const urls = arg
    ? [`https://${HOST}${arg.startsWith('/marathon/') ? arg : '/marathon/' + arg}`]
    : DEFAULT_URLS;

  console.log(`Submitting ${urls.length} URL(s) to IndexNow...`);
  urls.forEach(u => console.log(`  ${u}`));

  try {
    await submitToIndexNow(urls);
  } catch (err) {
    console.error('Submission failed:', err.message);
    process.exit(1);
  }
}

main();

/**
 * Canonical SEO URLs for the Marathon subsite on gdb.gg (Google, Bing, Open Graph, JSON-LD).
 * Static HTML under /marathon/ must use these — not marathondb.gg root paths.
 */
'use strict';

const SITE_ORIGIN = 'https://gdb.gg';
const MARATHON_PATH = '/marathon';
/** Canonical base for paths like /news/slug/ (no /marathon segment in the path). */
const MARATHON_SITE_URL = `${SITE_ORIGIN}${MARATHON_PATH}`;

const SEO = {
  SITE_ORIGIN,
  MARATHON_PATH,
  MARATHON_SITE_URL,
  /** og:site_name */
  OG_SITE_NAME: 'gdb.gg Marathon',
  /** Default when page has no custom image */
  DEFAULT_OG_IMAGE: `${SITE_ORIGIN}/assets/icons/marathon.svg`,
  TWITTER_SITE: '@MarathonDB',
  /** Favicon block for injected heads (absolute paths) */
  FAVICON_LINKS: `    <link rel="icon" type="image/svg+xml" href="/assets/icons/gdb-mark.svg">
    <link rel="apple-touch-icon" href="/assets/icons/gdb-mark.svg">`,
};

module.exports = SEO;

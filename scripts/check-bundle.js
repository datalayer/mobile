/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * The resolved-bundle gate of MOBILE.md §4.1 (M-006): what Metro actually put
 * in the iOS and Android bundles, read from their source maps. The source
 * gate (check-forbidden-imports.js) reads what the app imports; this reads
 * what those imports resolved to, transitively.
 * Usage: node scripts/check-bundle.js <export dir with source maps>
 */

const fs = require('fs');
const path = require('path');

// Primer Addons' portable entry and what it reaches; anything else of the package renders Primer web.
const PORTABLE =
  /\/(primer\/addons|@datalayer\/primer-addons)\/lib\/theme\/(portable|portableTheme|themeTokens|fontStacks|loopEyes|colors\/[A-Za-z]+|indicators\/[A-Za-z]+|themes\/[a-z]+ThemeStyles|css\/createThemeCSSVars)\.js$/;

const FORBIDDEN = [
  { pattern: /\/node_modules\/@jupyter\//, why: 'Jupyter' },
  { pattern: /\/node_modules\/@jupyterlab\//, why: 'JupyterLab' },
  { pattern: /\/node_modules\/@lumino\//, why: 'Lumino' },
  { pattern: /\/node_modules\/@datalayer\/jupyter-|\/tech\/jupyter\//, why: 'Datalayer Jupyter' },
  { pattern: /\/node_modules\/@primer\/(react|react-brand)\//, why: 'Primer web' },
  { pattern: /\/node_modules\/styled-components\//, why: 'styled-components' },
  { pattern: /\/node_modules\/react-dom\//, why: 'React DOM' },
  { pattern: /\.css$/, why: 'CSS' },
  {
    pattern: /\/node_modules\/@datalayer\/core\/|\/tech\/datalayer\/core\//,
    allowed: /\/(tech\/datalayer\/core|@datalayer\/core)\/lib\/portable\/[A-Za-z]+\.js$/,
    why: 'Core beyond its portable entry (M-002)'
  },
  {
    pattern: /\/node_modules\/@datalayer\/agent-runtimes\/|\/ai\/agent-runtimes\//,
    allowed: /\/(ai\/agent-runtimes|@datalayer\/agent-runtimes)\/lib\/portable\/[A-Za-z]+\.js$/,
    why: 'Agent Runtimes beyond its portable entry (M-002)'
  },
  {
    pattern: /\/node_modules\/@datalayer\/primer-addons\/|\/primer\/addons\//,
    allowed: PORTABLE,
    why: 'Primer Addons beyond its portable entry'
  }
];

/** The forbidden modules among a bundle's sources, each with why. */
function bundleViolations(sources) {
  const found = [];
  for (const source of sources) {
    const rule = FORBIDDEN.find(entry => entry.pattern.test(source) && !(entry.allowed && entry.allowed.test(source)));
    if (rule) {
      found.push({ source, why: rule.why });
    }
  }
  return found;
}

function sourceMapsUnder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceMapsUnder(full);
    }
    return entry.name.endsWith('.map') ? [full] : [];
  });
}

module.exports = { FORBIDDEN, bundleViolations };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || 'dist/bundle');
  const maps = sourceMapsUnder(dir).filter(file => !file.includes(`${path.sep}web${path.sep}`));
  if (maps.length === 0) {
    console.error(`No source map under ${dir}: export the iOS and Android bundles with --source-maps first.`);
    process.exit(2);
  }
  let total = 0;
  for (const map of maps) {
    const { sources = [] } = JSON.parse(fs.readFileSync(map, 'utf8'));
    const violations = bundleViolations(sources);
    total += violations.length;
    for (const { source, why } of violations) {
      console.error(`${path.relative(dir, map)}: ${source} — ${why}`);
    }
    console.log(`${path.relative(dir, map)}: ${sources.length} modules, ${violations.length} forbidden.`);
  }
  if (total) {
    console.error(`\n${total} forbidden module(s) in the bundles: see MOBILE.md §4.1.`);
    process.exit(1);
  }
}

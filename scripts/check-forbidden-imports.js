/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * The forbidden-import gate of MOBILE.md §4.1 (M-006), on source files.
 * Usage: node scripts/check-forbidden-imports.js [dir ...]   (default: app src)
 */

const fs = require('fs');
const path = require('path');

const FORBIDDEN = [
  { pattern: /^@jupyter\//, why: 'Jupyter' },
  { pattern: /^@jupyterlab\//, why: 'JupyterLab' },
  { pattern: /^@lumino\//, why: 'Lumino' },
  { pattern: /^@datalayer\/jupyter-/, why: 'Datalayer Jupyter' },
  { pattern: /^@datalayer\/core(?!\/lib\/portable$)(\/|$)/, why: 'Core beyond lib/portable (M-002)' },
  {
    pattern: /^@datalayer\/agent-runtimes(?!\/lib\/portable$)(\/|$)/,
    why: 'Agent Runtimes beyond lib/portable (M-002)'
  },
  { pattern: /^@primer\/react(\/|$)/, why: 'Primer web' },
  {
    pattern: /^@datalayer\/primer-addons(?!\/lib\/theme\/portable$)(\/|$)/,
    why: 'Primer Addons beyond lib/theme/portable: the rest renders Primer web'
  },
  { pattern: /^styled-components(\/|$)/, why: 'styled-components' },
  { pattern: /^react-dom(\/|$)/, why: 'React DOM' },
  { pattern: /\.css$/, why: 'CSS' }
];

const BROWSER_GLOBALS = /\b(window|document|localStorage|sessionStorage)\s*\??\./;

// Hermes implements Intl.Collator, DateTimeFormat and NumberFormat only: any other Intl
// constructor is undefined in the app, and `new` on it throws "undefined cannot be used as
// a constructor" (the Inbox went blank in the first Maestro run, 16 October 2026).
const HERMES_MISSING_INTL = /\bIntl\.(RelativeTimeFormat|PluralRules|ListFormat|DisplayNames|Segmenter|Locale|DurationFormat)\b/;

// Metro resolves `x.web.ts` only for the web preview, never for iOS or Android.
const WEB_ONLY = /\.web\.[cm]?[jt]sx?$/;

// `import … from 'x'`, `import 'x'`, `export … from 'x'`, `require('x')`, `import('x')`, type-only included.
const SPECIFIERS = [
  /\bimport\s+(?:type\s+)?[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\bimport\s*['"]([^'"]+)['"]/g,
  /\bexport\s+(?:type\s+)?[^'"]*?\bfrom\s*['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
];

const SOURCE = /\.(?:[cm]?[jt]sx?)$/;

function filesUnder(target) {
  const stat = fs.statSync(target);
  if (stat.isFile()) {
    return SOURCE.test(target) ? [target] : [];
  }
  return fs
    .readdirSync(target, { withFileTypes: true })
    .filter(entry => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .flatMap(entry => filesUnder(path.join(target, entry.name)));
}

/** Comments out, so a mention in prose is not an import. */
const withoutComments = text => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

function violationsIn(file, text) {
  const code = withoutComments(text);
  const found = [];
  for (const expression of SPECIFIERS) {
    for (const match of code.matchAll(expression)) {
      const specifier = match[1];
      const rule = FORBIDDEN.find(entry => entry.pattern.test(specifier));
      if (rule) {
        found.push({ file, specifier, why: rule.why });
      }
    }
  }
  const global = WEB_ONLY.test(file) ? null : BROWSER_GLOBALS.exec(code);
  if (global) {
    found.push({ file, specifier: global[1], why: 'a browser global' });
  }
  const intl = HERMES_MISSING_INTL.exec(code);
  if (intl) {
    found.push({ file, specifier: intl[0], why: 'an Intl API Hermes does not have' });
  }
  return found;
}

function findViolations(targets) {
  return targets.flatMap(filesUnder).flatMap(file => violationsIn(file, fs.readFileSync(file, 'utf8')));
}

module.exports = { FORBIDDEN, findViolations, violationsIn };

if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  const targets = (process.argv.slice(2).length ? process.argv.slice(2) : ['app', 'src']).map(target =>
    path.resolve(root, target)
  );
  const violations = findViolations(targets);
  for (const { file, specifier, why } of violations) {
    console.error(`${path.relative(root, file)}: ${specifier} — ${why}`);
  }
  if (violations.length) {
    console.error(`\n${violations.length} forbidden import(s): see MOBILE.md §4.1.`);
    process.exit(1);
  }
  console.log(`No forbidden import in ${targets.map(target => path.relative(root, target)).join(', ')}.`);
}

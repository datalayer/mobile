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
  { pattern: /^@datalayer\/core$/, why: 'the Core barrel: use an approved client/native subpath' },
  { pattern: /^@datalayer\/agent-runtimes$/, why: 'the Agent Runtimes barrel: use an approved client/native subpath' },
  { pattern: /^@primer\/react(\/|$)/, why: 'Primer web' },
  {
    pattern: /^@datalayer\/primer-addons(?!\/lib\/theme\/portable$)(\/|$)/,
    why: 'Primer Addons beyond lib/theme/portable: the rest renders Primer web'
  },
  { pattern: /^styled-components(\/|$)/, why: 'styled-components' },
  { pattern: /^react-dom(\/|$)/, why: 'React DOM' },
  { pattern: /\.css$/, why: 'CSS' }
];

const BROWSER_GLOBALS = /\b(window|document|localStorage|sessionStorage)\s*\./;

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
  const global = BROWSER_GLOBALS.exec(code);
  if (global) {
    found.push({ file, specifier: global[1], why: 'a browser global' });
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

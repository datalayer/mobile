/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * The bundle-size budget: the Hermes bytecode bundle each
 * platform's export ships, and the assets beside it, measured on every Check
 * run from the same exports the resolved-bundle gate reads. The budget comes
 * from the Phase 1 measurement (Check run 38876694406, 16 October 2026:
 * iOS 2.8 MB, Android 2.9 MB of Hermes bytecode) with room for the phases
 * still to come; raise it only with a measurement that says why.
 * Usage: node scripts/bundle-size.js <export dir> (dist/bundle)
 */

const fs = require('fs');
const path = require('path');

/** The largest Hermes bundle a platform may ship, in bytes. */
const BUNDLE_BUDGET = 3500000;

function filesUnder(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(full) : [full];
  });
}

/** Each platform's bundle and asset bytes under an export directory (one folder per platform). */
function sizesOf(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && entry.name !== 'web')
    .map(entry => {
      const files = filesUnder(path.join(dir, entry.name)).filter(file => !file.endsWith('.map'));
      const bundles = files.filter(file => file.endsWith('.hbc'));
      const size = file => fs.statSync(file).size;
      const bundle = bundles.reduce((sum, file) => sum + size(file), 0);
      const assets = files
        .filter(file => !file.endsWith('.hbc') && !file.endsWith('.json'))
        .reduce((sum, file) => sum + size(file), 0);
      return { platform: entry.name, bundles: bundles.length, bundle, assets };
    });
}

/** The platforms whose bundle is missing or above the budget, each with why. */
function overBudget(sizes, budget = BUNDLE_BUDGET) {
  return sizes.flatMap(({ platform, bundles, bundle }) => {
    if (bundles === 0) {
      return [`${platform}: no Hermes bundle (.hbc) in the export`];
    }
    return bundle > budget ? [`${platform}: ${bundle} bytes of Hermes bytecode, above the ${budget} budget`] : [];
  });
}

module.exports = { BUNDLE_BUDGET, sizesOf, overBudget };

if (require.main === module) {
  const dir = path.resolve(process.argv[2] || 'dist/bundle');
  const sizes = sizesOf(dir);
  const lines = [
    '| Platform | Hermes bundle (bytes) | Assets (bytes) | Budget (bytes) |',
    '|---|---|---|---|',
    ...sizes.map(({ platform, bundle, assets }) => `| ${platform} | ${bundle} | ${assets} | ${BUNDLE_BUDGET} |`)
  ];
  console.log(lines.join('\n'));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Bundle size\n\n${lines.join('\n')}\n`);
  }
  const problems = sizes.length === 0 ? [`no platform export under ${dir}`] : overBudget(sizes);
  if (problems.length) {
    problems.forEach(problem => console.error(problem));
    process.exit(1);
  }
}

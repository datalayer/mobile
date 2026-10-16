/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['node_modules/*', '.expo/*', 'dist/*', 'scripts/fixtures/*']
  },
  {
    // The gates run under plain node, and their tests load them the same way (app.config.ts as the CLI does).
    files: ['scripts/**/*.js', 'src/test/forbiddenImports.test.ts', 'src/test/bundleGate.test.ts', 'src/test/bundleSize.test.ts', 'src/test/releaseManifests.test.ts'],
    languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly', process: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  }
]);

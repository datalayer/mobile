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
    // The import gate runs under plain node, and its test loads it the same way.
    files: ['scripts/**/*.js', 'src/test/forbiddenImports.test.ts'],
    languageOptions: { globals: { __dirname: 'readonly', require: 'readonly', module: 'readonly', process: 'readonly' } },
    rules: { '@typescript-eslint/no-require-imports': 'off' }
  }
]);

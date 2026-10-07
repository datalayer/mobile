/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import path from 'path';

const { findViolations, violationsIn } = require('../../scripts/check-forbidden-imports.js');

const root = path.resolve(__dirname, '../..');

describe('the forbidden-import gate (M-006)', () => {
  it('refuses every forbidden family in the fixture, type-only imports included', () => {
    const found: { specifier: string }[] = findViolations([path.join(root, 'scripts/fixtures/forbidden.ts')]);
    expect(found.map(v => v.specifier).sort()).toEqual(
      [
        '@jupyterlab/services',
        '@lumino/widgets',
        '@jupyter/web-components',
        '@datalayer/jupyter-react',
        '@datalayer/core',
        '@datalayer/agent-runtimes',
        '@primer/react',
        'react-dom/client',
        './styles.css',
        '@lumino/signaling',
        '@jupyterlab/notebook',
        '@jupyter/ydoc',
        'localStorage'
      ].sort()
    );
  });

  it('allows approved subpaths, React Native and a mention in a comment', () => {
    const text = [
      "import { View } from 'react-native';",
      "import { personOf } from '@datalayer/core/native';",
      "import { sessionClient } from '@datalayer/agent-runtimes/client';",
      '// Not an import: @jupyterlab/services is named in prose.'
    ].join('\n');
    expect(violationsIn('ok.ts', text)).toEqual([]);
  });

  it('finds nothing in the app itself', () => {
    expect(findViolations([path.join(root, 'app'), path.join(root, 'src')])).toEqual([]);
  });
});

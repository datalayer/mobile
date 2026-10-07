/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

const { bundleViolations } = require('../../scripts/check-bundle.js');

type Violation = { source: string; why: string };

describe('the resolved-bundle gate (M-006)', () => {
  it('refuses every forbidden family, wherever the workspace put it', () => {
    const forbidden = [
      '/node_modules/@jupyterlab/services/lib/index.js',
      '/node_modules/@jupyter/ydoc/lib/index.js',
      '/node_modules/@lumino/widgets/dist/index.js',
      '/node_modules/@datalayer/jupyter-react/lib/index.js',
      '/tech/jupyter/ui/packages/react/lib/index.js',
      '/node_modules/@primer/react/lib/index.js',
      '/node_modules/@primer/react-brand/lib/index.js',
      '/node_modules/styled-components/dist/styled-components.cjs.js',
      '/node_modules/react-dom/index.js',
      '/node_modules/@primer/primitives/dist/css/base.css',
      '/tech/datalayer/core/lib/index.js',
      '/ai/agent-runtimes/lib/index.js',
      '/node_modules/@datalayer/core/lib/client/index.js',
      '/ai/agent-runtimes/lib/hooks/useToolApprovals.js',
      '/tech/primer/addons/lib/theme/themes/loopTheme.js',
      '/tech/primer/addons/lib/theme/themeRegistry.js',
      '/tech/primer/addons/lib/components/Box.js',
      '/node_modules/@datalayer/primer-addons/lib/index.js',
      '/node_modules/@datalayer/primer-addons/lib/theme/themes/loopTheme.js'
    ];
    const found: Violation[] = bundleViolations(forbidden);
    expect(found.map(v => v.source)).toEqual(forbidden);
  });

  it('lets the portable entries, React Native and the app through, from the workspace or from npm', () => {
    const allowed = [
      '/tech/datalayer/core/lib/portable/index.js',
      '/node_modules/@datalayer/core/lib/portable/person.js',
      '/ai/agent-runtimes/lib/portable/approvals.js',
      '/node_modules/@datalayer/agent-runtimes/lib/portable/index.js',
      '/tech/primer/addons/lib/theme/portable.js',
      '/node_modules/@datalayer/primer-addons/lib/theme/portable.js',
      '/node_modules/@datalayer/primer-addons/lib/theme/colors/loopColors.js',
      '/node_modules/@datalayer/primer-addons/lib/theme/themes/loopThemeStyles.js',
      '/tech/primer/addons/lib/theme/loopEyes.js',
      '/tech/primer/addons/lib/theme/colors/loopColors.js',
      '/tech/primer/addons/lib/theme/themes/loopThemeStyles.js',
      '/tech/primer/addons/lib/theme/css/createThemeCSSVars.js',
      '/node_modules/react-native/index.js',
      '/node_modules/@expo/ui/build/index.js',
      '/tech/datalayer/mobile/app/(app)/_layout.tsx'
    ];
    expect(bundleViolations(allowed)).toEqual([]);
  });
});

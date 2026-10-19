/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import manifest from '../../package.json';

describe('one React outside the monorepo', () => {
  it("holds every dependency's react and react-dom to the app's own", () => {
    // npm cannot resolve `$react` here; the versions are written out and must move together.
    expect(manifest.overrides.react).toBe(manifest.dependencies.react);
    expect(manifest.overrides['react-dom']).toBe(manifest.dependencies['react-dom']);
  });
});

/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { EmptyState, Screen } from '../../../src/components/primitives';

export default function Agents() {
  return (
    <Screen>
      <EmptyState title="Your agents" detail="Deployed applications and running agents will be listed here." />
    </Screen>
  );
}

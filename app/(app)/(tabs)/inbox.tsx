/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { EmptyState, Screen } from '../../../src/components/primitives';

export default function Inbox() {
  return (
    <Screen>
      <EmptyState title="Nothing waits for you" detail="Approvals and runs that need you will be here, oldest first." />
    </Screen>
  );
}

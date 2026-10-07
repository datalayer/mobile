/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { EmptyState, Screen } from '../../../src/components/primitives';

export default function Activity() {
  return (
    <Screen>
      <EmptyState title="Activity" detail="What your applications are doing, have scheduled and have done will be here." />
    </Screen>
  );
}

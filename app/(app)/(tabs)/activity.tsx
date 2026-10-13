/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Button, Screen } from '../../../src/components/primitives';
import { QueryView } from '../../../src/components/states';
import { ActivitySections, type Owners } from '../../../src/features/activity/ActivitySections';
import { ProtocolActivity } from '../../../src/features/activity/ProtocolActivity';
import { useAllActivity, useApplications, useFaces, useProtocolActivity } from '../../../src/features/queries';
import { AppFace } from '../../../src/identity/AppFace';

/** Every application's activity in one list (M-040), completed sessions a page at a time. */
export default function Activity() {
  const activity = useAllActivity();
  const applications = useApplications();
  const faces = useFaces();
  const protocols = useProtocolActivity();
  const names = new Map((applications.data ?? []).map(app => [app.appUid, app.name]));
  const owners: Owners = {
    nameOf: appUid => names.get(appUid) || 'An application',
    faceOf: appUid => <AppFace face={faces.byUid.get(appUid)} />
  };
  return (
    <Screen refreshing={activity.isRefetching} onRefresh={() => void activity.refetch()}>
      <QueryView query={activity}>
        {work => (
          <>
            <ActivitySections work={work} owners={owners} />
            {activity.hasNextPage ? (
              <Button
                label="Show more"
                tone="secondary"
                busy={activity.isFetchingNextPage}
                onPress={() => void activity.fetchNextPage()}
              />
            ) : null}
          </>
        )}
      </QueryView>
      <QueryView query={protocols}>
        {rows => <ProtocolActivity rows={rows} nameOf={owners.nameOf} />}
      </QueryView>
    </Screen>
  );
}

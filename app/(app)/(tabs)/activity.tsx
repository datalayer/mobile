/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRouter } from 'expo-router';
import { EmptyState, Screen } from '../../../src/components/primitives';
import { QueryView, Row } from '../../../src/components/states';
import { useApplications } from '../../../src/features/queries';

/**
 * Until the cross-application activity contract exists (M-040), the tab
 * leads to each application's own activity rather than asking once per
 * application.
 */
export default function Activity() {
  const router = useRouter();
  const applications = useApplications();
  return (
    <Screen refreshing={applications.isRefetching} onRefresh={() => void applications.refetch()}>
      <QueryView query={applications}>
        {apps =>
          apps.length === 0 ? (
            <EmptyState title="Activity" detail="What your applications are doing, have scheduled and have done will be here." />
          ) : (
            apps.map(app => (
              <Row
                key={app.appUid}
                title={app.name || 'Application'}
                detail="In progress, scheduled and completed work"
                onPress={() => router.push({ pathname: '/apps/[appUid]', params: { appUid: app.appUid } })}
              />
            ))
          )
        }
      </QueryView>
    </Screen>
  );
}

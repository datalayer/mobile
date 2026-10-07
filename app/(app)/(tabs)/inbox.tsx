/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useRouter } from 'expo-router';
import { EmptyState, Screen } from '../../../src/components/primitives';
import { QueryView, Row } from '../../../src/components/states';
import { actionOf, applicationOf, rowSummary } from '../../../src/features/approvals/format';
import { faceFor } from '../../../src/api/faces';
import { usePendingApprovals, useFaces } from '../../../src/features/queries';
import { AppFace } from '../../../src/identity/AppFace';
import { relativeTime } from '../../../src/i18n/time';

export default function Inbox() {
  const router = useRouter();
  const approvals = usePendingApprovals();
  const faces = useFaces();
  return (
    <Screen refreshing={approvals.isRefetching} onRefresh={() => void approvals.refetch()}>
      <QueryView query={approvals}>
        {list =>
          list.length === 0 ? (
            <EmptyState title="Nothing waits for you" detail="Approvals and runs that need you will be here, oldest first." />
          ) : (
            list.map(approval => (
              <Row
                key={approval.id}
                leading={<AppFace face={faceFor(faces, { appUid: approval.toolArgs._app_uid, agentId: approval.agentId })} />}
                title={actionOf(approval.toolName)}
                badge={approval.read ? undefined : 'New'}
                detail={rowSummary(approval)}
                meta={[applicationOf(approval), relativeTime(approval.createdAt)].filter(Boolean).join(' · ')}
                accessibilityHint="Opens the complete request"
                onPress={() => router.push({ pathname: '/approvals/[approvalId]', params: { approvalId: approval.id } })}
              />
            ))
          )
        }
      </QueryView>
    </Screen>
  );
}

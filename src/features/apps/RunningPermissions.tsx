/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Deployment } from '../../api/deployments';
import { EmptyState } from '../../components/primitives';
import { QueryView, Row, SectionTitle } from '../../components/states';
import { useRunningPermissions } from '../queries';

/** Rules and permissions of one exact deployed version, never the latest draft (M-044). */
export function RunningPermissions({ deployment }: { deployment: Deployment }) {
  const query = useRunningPermissions(deployment.appUid, deployment.version);
  return (
    <>
      <SectionTitle>{`Rules & permissions · ${deployment.target} v${deployment.version}`}</SectionTitle>
      <QueryView query={query}>
        {projection => !projection.known ? (
          <EmptyState title="Permissions not known" detail={projection.problem} />
        ) : (
          <>
            {projection.rules.length ? projection.rules.map((line, index) => (
              <Row key={`rule:${index}:${line}`} title={line} badge="Rule" />
            )) : <Row title="No rules declared." badge="Rules" />}
            {projection.permissions.length ? projection.permissions.map((line, index) => (
              <Row key={`permission:${index}:${line}`} title={line} badge="Permission" />
            )) : <Row title="No connection, Space, backend tool or computer permission declared." badge="Permissions" />}
          </>
        )}
      </QueryView>
    </>
  );
}

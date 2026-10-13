/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { deploymentEventWords } from '../../api/deployments';
import { QueryView, Row } from '../../components/states';
import { useDeploymentEvents } from '../queries';

export function LifecycleHistory({ deploymentUid }: { deploymentUid: string }) {
  const events = useDeploymentEvents(deploymentUid);
  return (
    <QueryView query={events}>
      {items => <>{items.slice(0, 5).map(event => <Row key={event.uid || `${event.kind}-${event.at}`} title={deploymentEventWords(event)} />)}</>}
    </QueryView>
  );
}

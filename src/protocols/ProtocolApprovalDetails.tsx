/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { View } from 'react-native';
import type { ProtocolApproval } from './approvals';
import { Field, SectionTitle } from '../components/states';
import { Text } from '../components/primitives';
import { absoluteTime } from '../i18n/time';
import { SPACE } from '../theme/tokens';

export function ProtocolApprovalDetails({ proposal }: { proposal: ProtocolApproval }) {
  if (proposal.kind === 'protocol-purchase') {
    return (
      <View style={{ gap: SPACE.sm }}>
        <SectionTitle>Exact purchase</SectionTitle>
        <Field label="Merchant" value={proposal.merchant} />
        <Field label="Protocol" value={proposal.protocol} />
        <Field label="In the merchant’s own words" value={proposal.summary} />
        {proposal.lines.map((line, index) => <Field key={`${line.title}-${index}`} label={`${line.quantity} × ${line.title}`} value={line.price} />)}
        {proposal.tax ? <Field label="Tax" value={proposal.tax} /> : null}
        <Field label="Total" value={proposal.total} />
        <Field label="Revision" value={proposal.revision} />
        <Text tone="muted" size="small">Approving authorizes this exact test purchase once. A changed basket must ask again.</Text>
      </View>
    );
  }

  return (
    <View style={{ gap: SPACE.sm }}>
      <SectionTitle>{`${proposal.company} asks you to confirm`}</SectionTitle>
      <Field label="In the company’s own words" value={proposal.summary} />
      <Field label="What it does" value={proposal.action} />
      {proposal.terms.map(term => <Field key={term.label} label={term.label} value={term.value} />)}
      <Field label="Revision" value={String(proposal.revision)} />
      <Field label="Reference" value={proposal.reference} />
      {proposal.expiresAt ? <Field label="Answer before" value={absoluteTime(proposal.expiresAt)} /> : null}
      {proposal.session ? <Field label="Session at the company" value={`${proposal.session.reference} · ${proposal.session.signedIn ? 'signed in as you' : 'not signed in'}`} /> : null}
      {proposal.previousRevision !== null ? <SectionTitle>{`Changed since revision ${proposal.previousRevision}`}</SectionTitle> : null}
      {proposal.changes.map(change => <Field key={change.label} label={change.label} value={`${change.before} → ${change.after}`} />)}
      <Text tone="muted" size="small">Approve, and it is performed once exactly as shown. Changed terms require a new approval.</Text>
    </View>
  );
}

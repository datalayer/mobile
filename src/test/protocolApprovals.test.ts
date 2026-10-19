/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { approvalOf } from '../api/approvals';
import { isKnownProtocolApproval, papOperationOf, protocolPurchaseOf } from '../protocols/approvals';
import { deploymentProtocolsOf, identityLinesOf, IDENTITY_UNREAD, protocolLinesOf } from '../protocols/deployments';

describe('protocol approvals on mobile', () => {
  it('reads an exact PAP operation, its revision, session and changed terms', () => {
    const approval = approvalOf({
      id: 'pap-1', agent_id: 'travel', runtime_name: 'pap', tool_name: 'pap_confirm', status: 'pending',
      expires_at: '2026-10-14T12:00:00Z',
      tool_args: {
        company: 'Example Air', summary: 'Move your flight to Tuesday for USD 25.00', class: 'write',
        operation_ref: 'op_92', revision: 3,
        terms: { flight: 'DL42', day: 'Tuesday', fee: { amount: '25', currency: 'usd' } },
        session: { ref: '3f2a9c01be47', signed_in: true },
        was: { revision: 2, terms: { flight: 'DL42', day: 'Monday', fee: { amount: '20', currency: 'USD' } } }
      }
    });

    expect(papOperationOf(approval)).toEqual(expect.objectContaining({
      kind: 'pap-operation', company: 'Example Air', action: 'Create or change', revision: 3,
      reference: 'op_92', expiresAt: '2026-10-14T12:00:00Z', previousRevision: 2,
      session: { reference: '3f2a9c01be47', signedIn: true }
    }));
    expect(papOperationOf(approval)?.terms).toContainEqual({ label: 'Fee', value: 'USD 25.00' });
    expect(papOperationOf(approval)?.changes).toEqual(expect.arrayContaining([
      { label: 'Day', before: 'Monday', after: 'Tuesday' },
      { label: 'Fee', before: 'USD 20.00', after: 'USD 25.00' }
    ]));
  });

  it.each([
    ['missing revision', { company: 'C', summary: 'S', class: 'buy', operation_ref: 'op', terms: {} }],
    ['unknown action class', { company: 'C', summary: 'S', class: 'teleport', operation_ref: 'op', revision: 1, terms: {} }],
    ['missing exact terms', { company: 'C', summary: 'S', class: 'buy', operation_ref: 'op', revision: 1 }]
  ])('fails a malformed PAP projection closed: %s', (_name, toolArgs) => {
    const approval = approvalOf({ runtime_name: 'pap', tool_name: 'pap_confirm', tool_args: toolArgs });
    expect(isKnownProtocolApproval(approval)).toBe(true);
    expect(papOperationOf(approval)).toBeNull();
  });

  it('reads every line and minor-unit total of an exact UCP purchase', () => {
    const approval = approvalOf({
      runtime_name: 'commerce', tool_name: 'ucp_complete',
      tool_args: {
        merchant: 'store.example', protocol: 'ucp', revision: 'checkout-4',
        summary: 'Buy two mugs from Example Store', currency: 'USD',
        lines: [{ title: 'Stoneware mug', quantity: 2, price: 1250 }], tax: 200, total: 2700
      }
    });
    expect(protocolPurchaseOf(approval)).toEqual({
      kind: 'protocol-purchase', merchant: 'store.example', protocol: 'UCP', revision: 'checkout-4',
      summary: 'Buy two mugs from Example Store',
      lines: [{ title: 'Stoneware mug', quantity: 2, price: 'USD 12.50' }], tax: 'USD 2.00', total: 'USD 27.00'
    });
  });

  it('does not partially summarize a malformed purchase', () => {
    const approval = approvalOf({
      runtime_name: 'commerce', tool_name: 'acp_complete',
      tool_args: { merchant: 'shop.example', protocol: 'acp', summary: 'Buy', revision: 'r1', currency: 'USD', lines: [], total: '2700' }
    });
    expect(isKnownProtocolApproval(approval)).toBe(true);
    expect(protocolPurchaseOf(approval)).toBeNull();
  });
});

describe('an application’s protocol capabilities', () => {
  it('reads only safe deployment projection fields and HTTPS endpoints', () => {
    const protocols = deploymentProtocolsOf({
      known: true, protocols: ['pap', 'ag-ui'], companies: ['manzanita.example'], businesses: ['air.example'],
      registry: [
        { id: 'pap', name: 'Personal Agent Protocol', version: 'draft 0.1', status: 'shipped' },
        { id: 'ag-ui', name: 'AG-UI', version: '0.0.1', status: 'shipped' }
      ],
      company: true, signs_requests: true,
      endpoints: [
        { kind: 'identity', url: 'https://iam.example/agent.json' },
        { kind: 'token', url: 'https://secret.example/token' },
        { kind: 'signing_keys', url: 'http://unsafe.example/keys' }
      ]
    });
    expect(protocols).toMatchObject({
      known: true, protocols: ['pap', 'ag-ui'], companies: ['manzanita.example'], businesses: ['air.example'],
      company: true, signsRequests: true,
      endpoints: [{ kind: 'identity', url: 'https://iam.example/agent.json' }]
    });
    expect(protocolLinesOf(protocols)).toContain('PAP draft 0.1 (shipped), AG-UI 0.0.1 (shipped)');
    expect(protocols?.identity).toBeUndefined();
    expect(protocolLinesOf(protocols)).toContain('Requests to companies and businesses are signed by Datalayer.');
  });

  it('does not guess when the projection is absent or malformed', () => {
    expect(deploymentProtocolsOf(undefined)).toBeNull();
    expect(deploymentProtocolsOf({ protocols: ['pap'] })).toBeNull();
    // A projection without the registry's word, or with an entry the phone cannot read, is not guessed at.
    expect(deploymentProtocolsOf({ known: true, protocols: ['pap'] })).toBeNull();
    expect(deploymentProtocolsOf({ known: true, protocols: ['pap'], registry: [{ id: 'pap' }] })).toBeNull();
    expect(protocolLinesOf(null)).toEqual(['What this version speaks is not known.']);
    expect(
      protocolLinesOf({
        known: true, protocols: ['future', 'pap'], registry: [{ id: 'future', name: 'future', version: '', status: 'unregistered' }],
        companies: [], businesses: [], company: false, signsRequests: false, endpoints: []
      })
    ).toEqual(['future (not in the registry), PAP (not said by the registry)']);
  });

  it('says the identity the server checked, what to do when it did not pass, and an unreadable check as unread', () => {
    const base = { known: true, protocols: ['pact'], registry: [], endpoints: [] };
    const passed = deploymentProtocolsOf({
      ...base,
      identity: { checked_at: '2026-10-16T08:00:00Z', passed: true, checks: [{ id: 'client-metadata', says: 'Its identity is published', passed: true, repair: '' }] }
    });
    expect(passed?.identity).toMatchObject({ passed: true, checkedAt: '2026-10-16T08:00:00Z' });
    expect(identityLinesOf(passed!.identity!)).toEqual(['Its identity is published']);
    const failed = deploymentProtocolsOf({
      ...base,
      identity: {
        checked_at: '2026-10-16T08:00:00Z', passed: false,
        checks: [
          { id: 'client-metadata', says: 'Its identity is published', passed: true, repair: '' },
          { id: 'jwks', says: 'Its keys are published', passed: false, repair: 'Its keys could not be read: try again in a moment.' }
        ]
      }
    });
    expect(identityLinesOf(failed!.identity!)).toEqual(['Its keys could not be read: try again in a moment.']);
    expect(deploymentProtocolsOf({ ...base, identity: null })?.identity).toBeNull();
    expect(deploymentProtocolsOf({ ...base, identity: { passed: 'yes' } })?.identity).toBe(IDENTITY_UNREAD);
  });
});

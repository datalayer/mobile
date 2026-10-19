/*
 * Copyright (c) 2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Protocol sign-ins watched to the end: asked with the
 * person's own sign-in, a continuation taken only bound to this application,
 * company and a verified issuer, the conversation going on once; refused and
 * expired said; the Device page's QR drawn without a native module.
 */

import { protocolDisplayOf, signInStandsOf, type SignInStands } from '@datalayer/agent-runtimes/lib/portable';
import { fireEvent, render } from '@testing-library/react-native';
import { MediatedForm } from '../features/conversations/MediatedForm';
import { ProtocolDisplayCard } from '../features/conversations/ProtocolDisplayCard';
import { qrRows } from '../features/conversations/QrCode';
import { forgetSignIns, pollSignIns, signInWatchOf, watchingAny, watchSignIn } from '../features/conversations/signInWatch';
import { DEFAULT_PREFERENCE, ThemeProvider } from '../theme/ThemeProvider';

const stands = (raw: Record<string, unknown>, appUid = 'app-1', company = 'shop.example'): SignInStands | null =>
  signInStandsOf({ app_uid: 'app-1', company: 'shop.example', issuer: 'https://shop.example', ...raw }, { appUid, company });

afterEach(() => forgetSignIns());

describe('a sign-in watched to the end', () => {
  it('goes on once when the gateway says it finished, bound to this application and company', async () => {
    const goOn = jest.fn();
    watchSignIn('app-1', 'shop.example', undefined, goOn);
    const answers = [stands({ status: 'pending' }), stands({ status: 'signed_in' }), stands({ status: 'signed_in' })];
    const ask = jest.fn(async () => answers.shift() ?? null);
    await pollSignIns(ask);
    expect(goOn).not.toHaveBeenCalled();
    await pollSignIns(ask);
    await pollSignIns(ask);
    expect(goOn).toHaveBeenCalledTimes(1);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(watchingAny()).toBe(false);
    // Watching it again once it finished starts a new watch, for a new sign-in.
    expect(watchSignIn('app-1', 'shop.example', undefined, goOn).state).toBe('watching');
  });

  it('never goes on for an answer that does not bind, and says a refusal and an expiry', async () => {
    const goOn = jest.fn();
    watchSignIn('app-1', 'shop.example', undefined, goOn);
    // Another application's or company's answer, or one without a verified issuer: refused by the codec.
    expect(stands({ status: 'signed_in' }, 'app-2')).toBeNull();
    expect(stands({ status: 'signed_in', issuer: 'http://shop.example' })).toBeNull();
    await pollSignIns(async () => null);
    expect(goOn).not.toHaveBeenCalled();
    await pollSignIns(async () => stands({ status: 'refused', reason: 'This sign-in was started in another browser.' }));
    expect(signInWatchOf('app-1', 'shop.example')).toMatchObject({ state: 'refused', reason: 'This sign-in was started in another browser.' });
    watchSignIn('app-1', 'other.example', '2026-10-15T10:00:00Z', goOn, Date.parse('2026-10-15T09:00:00Z'));
    await pollSignIns(async () => stands({ status: 'pending' }), Date.parse('2026-10-15T10:00:01Z'));
    expect(signInWatchOf('app-1', 'other.example')!.state).toBe('expired');
    expect(goOn).not.toHaveBeenCalled();
  });

  it('draws the Device page as a QR code, and says the sign-in is watched', async () => {
    const { size, rows } = qrRows('https://shop.example/device?code=AB-12');
    expect(size).toBeGreaterThanOrEqual(21);
    expect(rows).toHaveLength(size);
    expect(rows.every(runs => runs.reduce((sum, [, length]) => sum + length, 0) === size)).toBe(true);
    const display = protocolDisplayOf({
      type: 'application/vnd.datalayer.pap.sign-in+json', version: 1, id: 'd', text: 't',
      data: { mode: 'device', open: 'https://shop.example/device', code: 'AB-12' }
    })!;
    const watch = watchSignIn('app-1', 'shop.example', undefined, jest.fn());
    const store = { read: async () => DEFAULT_PREFERENCE, write: async () => undefined };
    const drawn = await render(
      <ThemeProvider store={store}>
        <ProtocolDisplayCard display={display} onOpenSignIn={jest.fn()} onOpenApproval={jest.fn()} onSignedIn={jest.fn()} watch={watch} />
      </ThemeProvider>
    );
    expect(drawn.getByLabelText('A code to scan to open shop.example on your phone')).toBeTruthy();
    expect(drawn.getByText('Waiting for you to sign in: this conversation goes on by itself once you have.')).toBeTruthy();
  });
});

describe('a mediated sign-in typed on the phone', () => {
  it('reads what the company asks with the one-use ticket, sends it once, and keeps nothing typed', async () => {
    const request = {
      companyName: 'Manzanita', companyDomain: 'shop.example', purpose: 'credentials' as const, sentTo: null,
      expiresAt: '2026-10-15T10:00:00Z',
      fields: [{ name: 'username', label: 'Name', secret: false }, { name: 'password', label: 'Password', secret: true }]
    };
    const input = { read: jest.fn(async () => request), send: jest.fn(async () => undefined) };
    const store = { read: async () => DEFAULT_PREFERENCE, write: async () => undefined };
    const drawn = await render(<ThemeProvider store={store}><MediatedForm ticket="Abc_def-0123456789xyz" input={input} /></ThemeProvider>);
    expect(await drawn.findByLabelText('Password')).toBeTruthy();
    expect(drawn.getByLabelText('Password').props.secureTextEntry).toBe(true);
    await fireEvent.changeText(drawn.getByLabelText('Name'), 'ada');
    await fireEvent.changeText(drawn.getByLabelText('Password'), 'secret');
    await fireEvent.press(drawn.getByTestId('mediated-send'));
    expect(input.send).toHaveBeenCalledWith('Abc_def-0123456789xyz', request, { username: 'ada', password: 'secret' });
    expect(await drawn.findByText('Done. Go back to your conversation: the agent continues once it checks.')).toBeTruthy();
    expect(drawn.queryByDisplayValue('secret')).toBeNull();
  });
});

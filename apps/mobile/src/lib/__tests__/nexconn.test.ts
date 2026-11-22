jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));

import { nexconnUserId, requestNexconnToken, startNexconnSession, useNexconnStore } from '../nexconn';

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as unknown as Response;
}

describe('nexconn session', () => {
  it('derives the Nexconn user id from the Supabase id', () => {
    expect(nexconnUserId('abc-123')).toBe('m_abc-123');
  });

  it('requests a live token with the idempotency header and Mudra user id', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({ nexconn: { access_token: 'tok', app_key: 'n19jmcy5nw379', mode: 'live' } })
    );
    const grant = await requestNexconnToken({ id: 'u1', name: 'Rajesh' }, fetchImpl);
    expect(grant).toEqual({ accessToken: 'tok', appKey: 'n19jmcy5nw379' });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://mudra.duckdns.org/api/v1/auth/session');
    expect(init.headers['X-Idempotency-Key']).toBeTruthy();
    expect(JSON.parse(init.body)).toMatchObject({
      nexconn_user_id: 'm_u1',
      display_name: 'Rajesh',
      role: 'guest',
      client_platform: 'android',
    });
  });

  it('rejects a non-live (mock) token', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(
      jsonResponse({ nexconn: { access_token: 'tok', app_key: 'k', mode: 'mock' } })
    );
    await expect(requestNexconnToken({ id: 'u1', name: 'x' }, fetchImpl)).rejects.toThrow('mock');
  });

  it('rejects an HTTP error', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(jsonResponse({}, 503));
    await expect(requestNexconnToken({ id: 'u1', name: 'x' }, fetchImpl)).rejects.toThrow('503');
  });

  it('never throws when the native module is missing (non-Android) and stays offline', async () => {
    const qc = { invalidateQueries: jest.fn() } as never;
    await expect(startNexconnSession({ id: 'u1', name: 'x' }, qc)).resolves.toBeUndefined();
    expect(useNexconnStore.getState().status).toBe('offline');
  });
});

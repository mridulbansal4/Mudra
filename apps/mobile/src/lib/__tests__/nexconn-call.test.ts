jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));

import { callEndText, canStartNexconnCall, startInspectionCall, useNexconnCallStore } from '../nexconn';

describe('nexconn inspection call', () => {
  it('maps SDK end reasons to short lines', () => {
    expect(callEndText('DECLINED')).toBe('call declined');
    expect(callEndText('NO_ANSWER')).toBe('no answer');
    expect(callEndText('REMOTE_CONNECTION_ERROR')).toBe('connection lost');
    expect(callEndText('KICKED_BY_SERVER')).toBe('call ended (kicked by server)');
  });

  it('is not offered without a live Nexconn connection', () => {
    expect(canStartNexconnCall()).toBe(false);
  });

  it('never throws when Nexconn is not connected and shows an error note', async () => {
    jest.useFakeTimers();
    await expect(startInspectionCall('u2', 'deal-1')).resolves.toBeUndefined();
    expect(useNexconnCallStore.getState().phase).toBe('error');
    expect(useNexconnCallStore.getState().note).toBe('Nexconn is not connected');
    jest.runAllTimers();
    expect(useNexconnCallStore.getState().phase).toBe('idle');
    jest.useRealTimers();
  });
});

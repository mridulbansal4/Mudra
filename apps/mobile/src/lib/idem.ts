import * as Crypto from 'expo-crypto';

/**
 * Generates a unique idempotency key (UUID v4) for mutating RPC calls.
 */
export function newIdemKey(): string {
  try {
    return Crypto.randomUUID();
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}

export const randomUUID = newIdemKey;

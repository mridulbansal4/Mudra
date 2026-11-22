import { Platform } from 'react-native';
import { requireOptionalNativeModule, type EventSubscription } from 'expo-modules-core';

export type NexconnMessage = {
  messageId: string;
  senderUserId: string;
  channelId: string;
  text: string;
  sentTime: number;
};

export type NexconnStatusEvent = { status: string };

type NativeNexconnChat = {
  sdkVersion(): string;
  currentUserId(): string | null;
  initialize(appKey: string): boolean;
  connect(token: string): Promise<string>;
  sendDirectText(toUserId: string, text: string): Promise<string | null>;
  disconnect(): void;
  addListener(event: 'onMessage', cb: (m: NexconnMessage) => void): EventSubscription;
  addListener(event: 'onConnectionStatus', cb: (s: NexconnStatusEvent) => void): EventSubscription;
};

// The native module only exists in Android builds (Nexconn ships no React Native SDK,
// so this wraps the official Android Chat SDK). Elsewhere (Jest, iOS, web) it is null.
const Native: NativeNexconnChat | null =
  Platform.OS === 'android' ? requireOptionalNativeModule<NativeNexconnChat>('NexconnChat') : null;

function requireNative(): NativeNexconnChat {
  if (!Native) throw new Error('Nexconn native module is not available on this platform');
  return Native;
}

export const NexconnChat = {
  isAvailable: (): boolean => Native !== null,
  sdkVersion: (): string | null => Native?.sdkVersion() ?? null,
  initialize: (appKey: string): boolean => requireNative().initialize(appKey),
  connect: (token: string): Promise<string> => requireNative().connect(token),
  sendDirectText: (toUserId: string, text: string): Promise<string | null> =>
    requireNative().sendDirectText(toUserId, text),
  disconnect: (): void => {
    Native?.disconnect();
  },
  onMessage: (cb: (m: NexconnMessage) => void): EventSubscription | null =>
    Native ? Native.addListener('onMessage', cb) : null,
  onConnectionStatus: (cb: (s: NexconnStatusEvent) => void): EventSubscription | null =>
    Native ? Native.addListener('onConnectionStatus', cb) : null,
};

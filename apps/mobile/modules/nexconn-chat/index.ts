import React from 'react';
import { Platform, View, type ViewProps } from 'react-native';
import {
  requireNativeViewManager,
  requireOptionalNativeModule,
  type EventSubscription,
} from 'expo-modules-core';

export type NexconnMessage = {
  messageId: string;
  senderUserId: string;
  channelId: string;
  text: string;
  sentTime: number;
};

export type NexconnStatusEvent = { status: string };

export type NexconnCallReceived = { callId: string; callerUserId: string; extra: string };
export type NexconnCallConnected = { callId: string; remoteUserId: string | null };
export type NexconnCallEnded = { callId: string | null; reason: string };

type NativeNexconnChat = {
  sdkVersion(): string;
  currentUserId(): string | null;
  initialize(appKey: string): boolean;
  connect(token: string): Promise<string>;
  sendDirectText(toUserId: string, text: string): Promise<string | null>;
  disconnect(): void;
  addListener(event: 'onMessage', cb: (m: NexconnMessage) => void): EventSubscription;
  addListener(event: 'onConnectionStatus', cb: (s: NexconnStatusEvent) => void): EventSubscription;
  addListener(event: 'onCallReceived', cb: (e: NexconnCallReceived) => void): EventSubscription;
  addListener(event: 'onCallConnected', cb: (e: NexconnCallConnected) => void): EventSubscription;
  addListener(event: 'onCallEnded', cb: (e: NexconnCallEnded) => void): EventSubscription;
  callSdkVersion(): string | null;
  callReady(): boolean;
  startVideoCall(calleeId: string, dealId: string): Promise<string>;
  acceptCall(callId: string): Promise<string | null>;
  endCall(callId: string | null): Promise<boolean>;
  enableCamera(on: boolean): void;
  enableMicrophone(on: boolean): void;
  switchCamera(): void;
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

/** 1:1 inspection video call over the official Nexconn Android Call SDK (same native module). */
export const NexconnCall = {
  isReady: (): boolean => Native?.callReady() ?? false,
  sdkVersion: (): string | null => Native?.callSdkVersion() ?? null,
  startVideoCall: (calleeId: string, dealId: string): Promise<string> =>
    requireNative().startVideoCall(calleeId, dealId),
  acceptCall: (callId: string): Promise<string | null> => requireNative().acceptCall(callId),
  endCall: (callId: string | null = null): Promise<boolean> =>
    Native ? Native.endCall(callId) : Promise.resolve(false),
  enableCamera: (on: boolean): void => Native?.enableCamera(on),
  enableMicrophone: (on: boolean): void => Native?.enableMicrophone(on),
  switchCamera: (): void => Native?.switchCamera(),
  onCallReceived: (cb: (e: NexconnCallReceived) => void): EventSubscription | null =>
    Native ? Native.addListener('onCallReceived', cb) : null,
  onCallConnected: (cb: (e: NexconnCallConnected) => void): EventSubscription | null =>
    Native ? Native.addListener('onCallConnected', cb) : null,
  onCallEnded: (cb: (e: NexconnCallEnded) => void): EventSubscription | null =>
    Native ? Native.addListener('onCallEnded', cb) : null,
};

export type NexconnCallViewProps = ViewProps & { kind: 'local' | 'remote'; userId?: string };

const NativeCallView: React.ComponentType<NexconnCallViewProps> | null = Native
  ? requireNativeViewManager<NexconnCallViewProps>('NexconnChat')
  : null;

/** Video surface of the current call: this phone's camera (local) or the peer's stream (remote). */
export function NexconnCallView(props: NexconnCallViewProps) {
  if (!NativeCallView) return React.createElement(View, { style: props.style });
  return React.createElement(NativeCallView, props);
}

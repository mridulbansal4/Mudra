import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { PhoneOff, RefreshCw, Video } from 'lucide-react-native';
import { C, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { NexconnCall, NexconnCallView } from '../../../modules/nexconn-chat';
import {
  acceptIncomingCall,
  declineIncomingCall,
  hangUpCall,
  useNexconnCallStore,
} from '@/lib/nexconn';
import { NeoButton, StatusPill, Text, VelvetCard } from '@/ui';

/**
 * Global layer for the Nexconn 1:1 inspection call: the incoming-call sheet, the
 * full-screen call (remote video big, local preview small, hang up) and the short
 * "call ended" note. Renders nothing while no call is active.
 */
export function CallOverlay() {
  const phase = useNexconnCallStore((s) => s.phase);
  const peerId = useNexconnCallStore((s) => s.peerId);
  const dealId = useNexconnCallStore((s) => s.dealId);
  const note = useNexconnCallStore((s) => s.note);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();

  const dealQuery = useQuery({
    queryKey: ['deal', dealId],
    queryFn: () => mudraApi.deal(dealId!),
    enabled: Boolean(dealId) && phase !== 'idle',
    staleTime: 30_000,
  });
  const peerName = dealQuery.data?.counterpart?.name || 'your counterpart';

  // The callee lands on the deal the call is about once it connects.
  useEffect(() => {
    if (phase !== 'connected' || !dealId) return;
    if (!pathname.startsWith(`/deal/${dealId}`)) router.push(`/deal/${dealId}` as never);
    // only when the call connects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === 'idle') return null;

  if (phase === 'ended' || phase === 'error') {
    return (
      <View pointerEvents="none" style={[styles.noteWrap, { top: insets.top + 64 }]}>
        <VelvetCard tone="card2" borderColor={phase === 'error' ? C.danger : C.border} style={styles.noteCard}>
          <Text size={14} weight={500} color={phase === 'error' ? C.danger : C.fg}>
            {note ?? 'call ended'}
          </Text>
        </VelvetCard>
      </View>
    );
  }

  if (phase === 'incoming') {
    return (
      <View style={styles.backdrop}>
        <VelvetCard
          tone="card2"
          borderColor={C.paccha}
          style={[styles.sheet, { marginBottom: Math.max(insets.bottom + 16, 24) }]}
        >
          <StatusPill tone="live" label="Nexconn call" />
          <Text weight={600} size={18} color={C.fg}>
            Incoming inspection call from {peerName}
          </Text>
          <Text variant="secondary" size={13} color={C.muted}>
            1:1 video over the Nexconn Call SDK
          </Text>
          <View style={styles.sheetButtons}>
            <NeoButton
              variant="danger"
              size="md"
              label="Decline"
              onPress={() => void declineIncomingCall()}
              style={styles.flex}
            />
            <NeoButton
              variant="paccha"
              size="md"
              label="Accept"
              icon={<Video size={16} color={C.bg} />}
              onPress={() => void acceptIncomingCall()}
              style={styles.flex}
            />
          </View>
        </VelvetCard>
      </View>
    );
  }

  const connected = phase === 'connected';
  return (
    <View style={styles.callScreen}>
      {connected && peerId ? (
        <NexconnCallView kind="remote" userId={peerId} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={styles.waiting}>
          <Text variant="display" size={24} color={C.fg} lowercase>
            calling {peerName}
          </Text>
          <Text variant="secondary" size={13} color={C.muted}>
            ringing over Nexconn
          </Text>
        </View>
      )}

      {connected ? (
        <View style={[styles.localPreview, { top: insets.top + 16 }]}>
          <NexconnCallView kind="local" style={StyleSheet.absoluteFill} />
        </View>
      ) : null}

      <View style={[styles.topLeft, { top: insets.top + 16 }]}>
        <StatusPill tone={connected ? 'live' : 'sunshine'} label={connected ? 'Nexconn live call' : 'calling'} />
      </View>

      <View style={[styles.controls, { paddingBottom: Math.max(insets.bottom + 20, 28) }]}>
        {connected ? (
          <NeoButton
            variant="ghost"
            size="md"
            label="flip camera"
            icon={<RefreshCw size={16} color={C.fg} />}
            onPress={() => NexconnCall.switchCamera()}
            style={styles.flex}
          />
        ) : null}
        <NeoButton
          variant="danger"
          size="md"
          label={connected ? 'hang up' : 'cancel'}
          icon={<PhoneOff size={16} color={C.fg} />}
          onPress={() => void hangUpCall()}
          style={styles.flex}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  sheet: { gap: 12 },
  sheetButtons: { flexDirection: 'row', gap: 12, marginTop: 4 },
  callScreen: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: C.void },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  localPreview: {
    position: 'absolute',
    right: 16,
    width: 112,
    height: 160,
    borderRadius: R.row,
    overflow: 'hidden',
    backgroundColor: C.card2,
    borderWidth: 1,
    borderColor: C.border,
  },
  topLeft: { position: 'absolute', left: 16 },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    // keeps the buttons readable over bright video
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  noteWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  noteCard: { paddingVertical: 12, paddingHorizontal: 18 },
});

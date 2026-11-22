import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, CheckCircle2, Image as ImageIcon, Sparkles, Video } from 'lucide-react-native';
import { C, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { relativeTime } from '@/lib/time';
import { pickImageFromGallery, uploadPhotoToMudra } from '@/lib/upload';
import { startInspectionCall, useNexconnCallStore, useNexconnStore } from '@/lib/nexconn';
import type { ChecklistItem, DealAction } from '@/types';
import {
  Eyebrow,
  HudBrackets,
  NeoButton,
  Skeleton,
  StatusPill,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

const DEFAULT_CHECKS: ChecklistItem[] = [
  { index: 0, label: 'show the whole item' },
  { index: 1, label: 'show it working or its key detail' },
  { index: 2, label: 'show any damage' },
];

export default function InspectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [permission, requestPermission] = useCameraPermissions();
  const [useSimulated, setUseSimulated] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [uploading, setUploading] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  const nexconnLive = useNexconnStore((s) => s.status === 'live');
  // The Nexconn call needs the camera, so the photo camera steps aside while a call is on.
  const inCall = useNexconnCallStore((s) => s.phase === 'ringing' || s.phase === 'incoming' || s.phase === 'connected');

  const dealQuery = useQuery({
    queryKey: ['deal', id],
    queryFn: () => mudraApi.deal(id!),
    enabled: Boolean(id),
    refetchInterval: 3000,
  });

  const deal = dealQuery.data;
  const isSeller = deal?.my_role === 'seller';
  const checklist: ChecklistItem[] =
    Array.isArray(deal?.checklist) && deal.checklist.length > 0 ? deal.checklist : DEFAULT_CHECKS;
  const doneCount = checklist.filter((c) => Boolean(c?.photo_url)).length;
  const nextIndex = checklist.findIndex((c) => !c?.photo_url);

  useEffect(() => {
    const tId = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(tId);
  }, []);

  useEffect(() => {
    if (!id || !deal?.counterpart?.is_demo_bot) return;
    const timer = setInterval(async () => {
      try {
        const updated = await mudraApi.demoTick(id);
        queryClient.setQueryData(['deal', id], updated);
      } catch {
        // ignore transient error
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, deal?.counterpart?.is_demo_bot, queryClient]);

  const actionMut = useMutation({
    mutationFn: (vars: { action: DealAction; payload?: Record<string, unknown> }) =>
      mudraApi.dealAction({
        deal_id: id!,
        action: vars.action,
        expected_version: deal?.version ?? 1,
        payload: vars.payload,
      }),
    onSuccess: (updated, vars) => {
      queryClient.setQueryData(['deal', id], updated);
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (vars.action === 'MARK_ASSAY_VERIFIED') router.replace(`/deal/${id}/receipt` as never);
      else if (vars.action === 'RAISE_DISPUTE') router.replace(`/deal/${id}/freeze` as never);
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
      dealQuery.refetch();
    },
  });

  const submitCheckPhoto = async (localOrRemoteUri: string) => {
    if (!deal || nextIndex < 0) return;
    setUploading(true);
    try {
      const publicUrl = await uploadPhotoToMudra(localOrRemoteUri, 'evidence', `${deal.id}/${nextIndex}-${Date.now()}.jpg`);
      await actionMut.mutateAsync({ action: 'CHECK_ITEM', payload: { index: nextIndex, photo_url: publicUrl } });
    } catch (err) {
      showToast((err as Error)?.message || t('errors.UNKNOWN'), 'danger');
    } finally {
      setUploading(false);
    }
  };

  const handleCaptureCamera = async () => {
    if (!cameraRef.current || nextIndex < 0) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.75 });
      if (photo?.uri) await submitCheckPhoto(photo.uri);
    } catch {
      setUseSimulated(true);
      showToast(t('inspect.simulated_label', 'simulated mode enabled'), 'neutral');
    }
  };

  const handlePickGallery = async () => {
    try {
      const uri = await pickImageFromGallery();
      if (uri) await submitCheckPhoto(uri);
    } catch (err) {
      showToast((err as Error)?.message || t('errors.UNKNOWN'), 'danger');
    }
  };

  const handleUseSimulatedPhoto = async () => {
    const photos = deal?.listing?.photos?.length
      ? deal.listing.photos
      : [deal?.listing?.photo || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80'];
    await submitCheckPhoto(photos[Math.max(0, nextIndex) % photos.length]);
  };

  const mmSs = `${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, '0')}`;
  const cameraDenied = !permission?.granted || useSimulated;

  if (!deal) {
    return (
      <View style={styles.screen}>
        <TopBar title={t('inspect.live_pill', 'live check')} />
        <View style={styles.pad}>
          <Skeleton height={220} radius={R.card} />
          <Skeleton height={120} radius={R.card} />
        </View>
      </View>
    );
  }

  if (isSeller) {
    return (
      <View style={styles.screen}>
        <TopBar
          title={t('inspect.live_pill', 'live check')}
          right={
            <Pressable onPress={() => setUseSimulated((v) => !v)} style={styles.simToggle}>
              <Text variant="mono" size={11} color={C.paccha}>
                {cameraDenied ? 'SIMULATED' : 'CAMERA'}
              </Text>
            </Pressable>
          }
        />

        <View style={styles.cameraStage}>
          {!cameraDenied && !inCall ? (
            <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
          ) : (
            <View style={styles.simStage}>
              <Image source={{ uri: deal.listing?.photo }} style={styles.simPreview} contentFit="cover" />
              <StatusPill tone="locked" label="SIMULATED" />
            </View>
          )}

          <HudBrackets style={StyleSheet.absoluteFill}>
            <View style={styles.hudTop}>
              <StatusPill tone="live" label={t('inspect.live_pill', 'LIVE')} />
              <Text variant="mono" size={13} color={C.fg} tabular>{mmSs}</Text>
              <Text variant="eyebrow" size={11} color={C.paccha} tabular>
                {t('inspect.checks_progress', { done: doneCount, total: checklist.length })}
              </Text>
            </View>
          </HudBrackets>
        </View>

        <View style={[styles.sellerBottom, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
          {nextIndex === -1 ? (
            <VelvetCard tone="card2" borderColor={C.paccha} style={styles.stepCard}>
              <Text weight={600} size={16} color={C.paccha}>
                {t('inspect.all_checks_sent', 'all checks sent. waiting for the buyer.')}
              </Text>
              <NeoButton variant="paccha" label={t('freeze.back_to_deal', 'back to deal')} onPress={() => router.replace(`/deal/${id}` as never)} />
            </VelvetCard>
          ) : (
            <VelvetCard tone="card2" style={styles.stepCard}>
              <Eyebrow label={`STEP ${nextIndex + 1} OF ${checklist.length}`} dot dotColor={C.paccha} />
              <Text variant="display" size={22} color={C.fg} lowercase>{checklist[nextIndex]?.label}</Text>
              {!permission?.granted && !useSimulated ? (
                <NeoButton variant="ghost" size="md" label="enable camera permission" onPress={() => requestPermission()} />
              ) : null}
              <View style={styles.captureRow}>
                {!cameraDenied ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="capture check photo" disabled={uploading || actionMut.isPending} onPress={handleCaptureCamera} style={styles.shutterBtn}>
                    {uploading ? <ActivityIndicator color={C.bg} /> : <Camera size={28} color={C.bg} />}
                  </Pressable>
                ) : null}
                <View style={styles.fallbackBtns}>
                  <NeoButton variant="paccha" size="md" label={`${t('inspect.use_listing_photo', 'use listing photo')} (${t('common.simulated', 'simulated')})`} icon={<Sparkles size={16} color={C.bg} />} loading={uploading || actionMut.isPending} onPress={handleUseSimulatedPhoto} />
                  <NeoButton variant="ghost" size="md" label={t('inspect.pick_from_gallery', 'pick from gallery')} icon={<ImageIcon size={16} color={C.fg} />} disabled={uploading || actionMut.isPending} onPress={handlePickGallery} />
                </View>
              </View>
            </VelvetCard>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <TopBar
        title={t('inspect.live_pill', 'live check')}
        right={<StatusPill tone="live" label={t('inspect.checks_progress', { done: doneCount, total: checklist.length })} />}
      />
      <ScrollView contentContainerStyle={[styles.buyerScroll, { paddingBottom: Math.max(insets.bottom + 24, 36) }]} showsVerticalScrollIndicator={false}>
        {checklist.map((item, idx) => (
          <VelvetCard key={idx} tone="card" borderColor={item.photo_url ? C.paccha : C.hairline} style={styles.checkCard}>
            <View style={styles.checkHeader}>
              <Eyebrow label={`CHECK ${idx + 1}`} dot dotColor={item.photo_url ? C.paccha : C.muted} />
              {item.photo_url ? (
                <View style={styles.rowInline}>
                  <CheckCircle2 size={15} color={C.paccha} />
                  <Text variant="secondary" size={11} color={C.muted}>{item.at ? relativeTime(item.at) : 'received'}</Text>
                </View>
              ) : null}
            </View>
            <Text weight={600} size={16} color={C.fg}>{item.label}</Text>
            {item.photo_url ? (
              <Image source={{ uri: item.photo_url }} style={styles.buyerPhoto} contentFit="cover" transition={150} />
            ) : (
              <View style={styles.waitingBox}>
                <ActivityIndicator size="small" color={C.paccha} />
                <Text variant="secondary" size={13} color={C.muted}>{t('inspect.waiting_for_seller', 'waiting for seller…')}</Text>
              </View>
            )}
          </VelvetCard>
        ))}

        <View style={styles.buyerActions}>
          {nexconnLive && deal.counterpart?.id && !deal.counterpart.is_demo_bot ? (
            <NeoButton
              variant="white"
              size="md"
              label={t('inspect.video_call_nexconn', 'Video call over Nexconn')}
              icon={<Video size={16} color={C.bg} />}
              disabled={inCall}
              onPress={() => void startInspectionCall(deal.counterpart!.id, deal.id)}
            />
          ) : null}
          <NeoButton variant="paccha" size="lg" label={t('inspect.looks_good_verify', 'looks good — mark verified')} loading={actionMut.isPending} onPress={() => actionMut.mutate({ action: 'MARK_ASSAY_VERIFIED' })} />
          <NeoButton variant="danger" size="md" label={t('inspect.somethings_off_freeze', "something's off — freeze")} disabled={actionMut.isPending} onPress={() => actionMut.mutate({ action: 'RAISE_DISPUTE', payload: { reason: 'live check dispute' } })} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16, gap: 14 },
  simToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: R.chip, backgroundColor: C.card2, borderWidth: 1, borderColor: C.paccha },
  cameraStage: { flex: 1, margin: 16, borderRadius: R.card, overflow: 'hidden', backgroundColor: C.card },
  simStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  simPreview: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.45 },
  hudTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  sellerBottom: { paddingHorizontal: 16 },
  stepCard: { gap: 12 },
  captureRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 4 },
  shutterBtn: { width: 68, height: 68, borderRadius: 34, backgroundColor: C.paccha, borderWidth: 4, borderColor: C.fg, alignItems: 'center', justifyContent: 'center' },
  fallbackBtns: { flex: 1, gap: 8 },
  buyerScroll: { padding: 16, gap: 14 },
  checkCard: { gap: 10 },
  checkHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  buyerPhoto: { width: '100%', height: 220, borderRadius: 16, backgroundColor: C.card2 },
  waitingBox: { height: 110, borderRadius: 14, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10 },
  buyerActions: { marginTop: 8, gap: 12 },
});

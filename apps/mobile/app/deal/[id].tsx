import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BadgeCheck, ChevronLeft, MoreVertical, Scale, Send, ShieldAlert } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { getDealNextStep, type NextStepActionType } from '@/features/deals/nextStep';
import { getContextualQuickKeys, getQuickReplyText, type QuickReplyKey } from '@/i18n/quick';
import { parseMoneyInput } from '@/lib/money';
import { relativeTime } from '@/lib/time';
import { useSessionStore } from '@/state/session';
import type { DealAction, Message } from '@/types';
import {
  BilingualBubble, ListGroup, ListRow, NeoButton, OfferCard, Price,
  ProgressSegments, Sheet, Skeleton, StatusPill, SystemLine, Text, VelvetCard, showToast,
} from '@/ui';

export default function DealRoomScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const me = useSessionStore((s) => s.me);
  const locale = useSessionStore((s) => s.locale) ?? 'en';

  const [draftText, setDraftText] = useState('');
  const [optimisticMsgs, setOptimisticMsgs] = useState<Message[]>([]);
  const [translatingIds, setTranslatingIds] = useState<Record<string, boolean>>({});
  const [localTranslations, setLocalTranslations] = useState<Record<string, string>>({});
  const [sheetMode, setSheetMode] = useState<'menu' | 'counter' | 'report' | null>(null);
  const [counterInput, setCounterInput] = useState('');
  const focusedRef = useRef(true);

  const dealQuery = useQuery({ queryKey: ['deal', id], queryFn: () => mudraApi.deal(id!), enabled: Boolean(id), refetchInterval: 4000 });
  const msgsQuery = useQuery({ queryKey: ['messages', id], queryFn: () => mudraApi.messages(id!, 0), enabled: Boolean(id), refetchInterval: 4000 });
  const deal = dealQuery.data;

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    if (id) { void dealQuery.refetch(); void msgsQuery.refetch(); }
    return () => { focusedRef.current = false; };
  }, [id]));

  useEffect(() => {
    if (!id || !deal?.counterpart?.is_demo_bot) return;
    const timer = setInterval(async () => {
      if (!focusedRef.current) return;
      try {
        const updated = await mudraApi.demoTick(id);
        queryClient.setQueryData(['deal', id], updated);
        void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(timer);
  }, [id, deal?.counterpart?.is_demo_bot, queryClient]);

  const actionMut = useMutation({
    mutationFn: (vars: { action: DealAction; payload?: Record<string, unknown> }) =>
      mudraApi.dealAction({ deal_id: id!, action: vars.action, expected_version: deal?.version ?? 1, payload: vars.payload }),
    onSuccess: (updated) => {
      queryClient.setQueryData(['deal', id], updated);
      void queryClient.invalidateQueries({ queryKey: ['messages', id] });
      void queryClient.invalidateQueries({ queryKey: ['deals'] });
      if (updated.state === 'INSPECTION_LIVE' && updated.my_role === 'seller') router.push(`/deal/${id}/inspect` as never);
      else if (updated.state === 'DISPUTED_FROZEN') router.push(`/deal/${id}/freeze` as never);
    },
    onError: (err: Error) => {
      showToast(err.message || t('deals.updated_try_again'), 'danger');
      void dealQuery.refetch();
    },
  });

  const sendMessage = async (body: string, quickKey?: QuickReplyKey) => {
    const clean = body.trim();
    if (!clean || !id) return;
    const tempId = `opt-${Date.now()}`;
    setOptimisticMsgs((prev) => [
      ...prev,
      { id: tempId, deal_id: id, sender_id: me?.id ?? 'me', kind: quickKey ? 'quick' : 'text', body: clean, quick_key: quickKey ?? null, lang: locale, created_at: new Date().toISOString(), optimistic: true },
    ]);
    if (!quickKey) setDraftText('');
    try {
      await mudraApi.sendMessage({ deal_id: id, body: clean, quick_key: quickKey });
      await msgsQuery.refetch();
    } catch (err) {
      showToast((err as Error)?.message || t('errors.UNKNOWN'), 'danger');
    } finally {
      setOptimisticMsgs((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleTranslate = async (msg: Message) => {
    const key = String(msg.id);
    if (translatingIds[key]) return;
    setTranslatingIds((s) => ({ ...s, [key]: true }));
    try {
      const res = await mudraApi.translateMessage(msg.id, locale);
      if (res?.text) setLocalTranslations((s) => ({ ...s, [key]: res.text! }));
    } catch { /* ignore */ } finally {
      setTranslatingIds((s) => ({ ...s, [key]: false }));
    }
  };

  const handleNextStep = (actionType?: NextStepActionType) => {
    if (!deal || !actionType) return;
    if (actionType === 'ACCEPT' || actionType === 'CANCEL' || actionType === 'START_ASSAY' || actionType === 'CHOOSE_IN_PERSON' || actionType === 'CONFIRM_IN_PERSON') {
      actionMut.mutate({ action: actionType });
    } else if (actionType === 'OPEN_ESCROW') router.push(`/deal/${id}/escrow` as never);
    else if (actionType === 'OPEN_INSPECT' || actionType === 'MARK_VERIFIED') router.push(`/deal/${id}/inspect` as never);
    else if (actionType === 'OPEN_RECEIPT') router.push(`/deal/${id}/receipt` as never);
    else if (actionType === 'OPEN_FREEZE') router.push(`/deal/${id}/freeze` as never);
    else if (actionType === 'OPEN_REVIEW') router.push(`/deal/${id}/review` as never);
    else if (actionType === 'BROWSE_SIMILAR') router.push('/(tabs)/explore' as never);
  };

  const invertedMessages = useMemo(() => [...(msgsQuery.data ?? []), ...optimisticMsgs].reverse(), [msgsQuery.data, optimisticMsgs]);
  const accent = deal?.my_role === 'seller' ? C.paccha : C.purple;
  const nextStep = deal ? getDealNextStep(deal, locale) : null;
  const quickKeys = deal ? getContextualQuickKeys(deal.state, deal.my_role) : [];
  const canFreeze = Boolean(deal?.allowed_actions?.includes('RAISE_DISPUTE'));

  const renderMessage = ({ item }: { item: Message }) => {
    const mine = Boolean(me?.id && item.sender_id === me.id);
    const payload = (item.payload || {}) as Record<string, unknown>;
    if (item.kind === 'system' || item.kind === 'escrow') return <SystemLine text={item.body} />;
    if (item.kind === 'offer') {
      return (
        <OfferCard
          amountMinor={Number(payload.amount_minor ?? deal?.amount_minor ?? 0)}
          currency={deal?.currency || 'INR'}
          swapOffer={(payload.swap_offer as string) || deal?.swap_offer}
          byMe={mine}
          canRespond={Boolean(deal?.state === 'OFFERED' && !deal.offer_by_me && !mine)}
          onAccept={() => actionMut.mutate({ action: 'ACCEPT' })}
          onCounter={() => setSheetMode('counter')}
          onDecline={() => actionMut.mutate({ action: 'DECLINE' })}
          loading={actionMut.isPending}
        />
      );
    }
    if (item.kind === 'evidence') {
      const photoUrl = String(payload.photo_url || '');
      return (
        <VelvetCard tone="card2" padding={12} style={styles.specialCard} onPress={() => router.push(`/deal/${id}/inspect` as never)}>
          {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.evidenceImg} contentFit="cover" /> : null}
          <Text weight={600} size={13} color={C.paccha}>{String(payload.label || item.body || 'live check')}</Text>
        </VelvetCard>
      );
    }
    if (item.kind === 'receipt' || item.kind === 'verdict') {
      const isReceipt = item.kind === 'receipt';
      const toneColor = isReceipt ? C.paccha : C.sunshine;
      return (
        <VelvetCard tone="card2" borderColor={toneColor} style={styles.specialCard} onPress={() => router.push((isReceipt ? `/deal/${id}/receipt` : `/deal/${id}/freeze`) as never)}>
          <View style={styles.rowInline}>
            {isReceipt ? <BadgeCheck size={18} color={toneColor} /> : <Scale size={18} color={toneColor} />}
            <Text weight={600} size={14} color={toneColor}>{item.body || (isReceipt ? t('deals.view_receipt') : t('deals.view_verdict'))}</Text>
          </View>
        </VelvetCard>
      );
    }
    const translated = (item.quick_key ? getQuickReplyText(item.quick_key, locale) : null) || item.translations?.[locale] || localTranslations[String(item.id)] || null;
    return (
      <BilingualBubble
        mine={mine}
        text={item.body}
        translated={translated}
        senderLang={item.lang}
        timestamp={relativeTime(item.created_at)}
        translating={Boolean(translatingIds[String(item.id)])}
        onRequestTranslate={!mine ? () => handleTranslate(item) : undefined}
      />
    );
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.back')} onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/deals' as never))} style={styles.iconBtn}>
          <ChevronLeft size={22} color={C.fg} />
        </Pressable>
        {deal?.listing?.photo ? <Image source={{ uri: deal.listing.photo }} style={styles.headerThumb} contentFit="cover" /> : null}
        <View style={styles.headerText}>
          <Text weight={600} size={15} color={C.fg} numberOfLines={1}>{deal?.listing?.title || t('common.loading')}</Text>
          <Text variant="secondary" size={12} color={C.muted} numberOfLines={1}>{deal?.counterpart?.name || ''} · <Text variant="mono" size={11}>{deal?.short_code}</Text></Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="deal options" onPress={() => setSheetMode('menu')} style={styles.iconBtn}>
          <MoreVertical size={20} color={C.fg} />
        </Pressable>
      </View>

      {deal ? (
        <View style={styles.topCards}>
          <VelvetCard padding={12} radius={16} tone="card" style={styles.stripCard}>
            <View style={styles.stripTop}>
              <Price minor={deal.amount_minor} currency={deal.currency} kind={deal.kind} variant="display" size={22} />
              <StatusPill state={deal.state} label={t(`deals.state_${deal.state}`, { defaultValue: deal.state })} />
            </View>
            <ProgressSegments stage={deal.story_stage || 1} accent={accent} />
          </VelvetCard>
          {nextStep ? (
            <VelvetCard padding={12} radius={16} tone="card2" borderColor={accent} style={styles.stripCard}>
              <View style={styles.nextRow}>
                <Text size={13} weight={500} color={C.fg} style={styles.headerText}>{nextStep.sentence}</Text>
                {nextStep.buttonLabel && nextStep.actionType ? (
                  <NeoButton variant={deal.my_role === 'seller' ? 'paccha' : 'purple'} size="md" label={nextStep.buttonLabel} fullWidth={false} loading={actionMut.isPending} onPress={() => handleNextStep(nextStep.actionType)} />
                ) : null}
              </View>
              {deal.state === 'OFFERED' && !deal.offer_by_me ? (
                <View style={styles.subActions}>
                  <Pressable onPress={() => setSheetMode('counter')}><Text size={12} weight={600} color={accent}>{t('deals.counter')}</Text></Pressable>
                  <Pressable onPress={() => actionMut.mutate({ action: 'DECLINE' })}><Text size={12} weight={600} color={C.danger}>{t('deals.decline')}</Text></Pressable>
                </View>
              ) : canFreeze ? (
                <View style={styles.subActions}>
                  {deal.state === 'FUNDED' && deal.my_role === 'buyer' ? (
                    <Pressable onPress={() => router.push(`/deal/${id}/inspect` as never)}><Text size={12} weight={600} color={C.paccha}>{t('inspect.live_pill')}</Text></Pressable>
                  ) : null}
                  <Pressable onPress={() => actionMut.mutate({ action: 'RAISE_DISPUTE', payload: { reason: 'freeze' } })}><Text size={12} weight={600} color={C.danger}>{t('inspect.somethings_off_freeze')}</Text></Pressable>
                </View>
              ) : null}
            </VelvetCard>
          ) : null}
        </View>
      ) : (
        <View style={styles.topCards}><Skeleton height={64} radius={16} /></View>
      )}

      <FlatList data={invertedMessages} inverted keyExtractor={(m) => String(m.id)} renderItem={renderMessage} contentContainerStyle={styles.msgList} showsVerticalScrollIndicator={false} />

      <View style={[styles.bottomDock, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quickKeys.map((qk) => {
            const label = getQuickReplyText(qk, locale);
            return <Pressable key={qk} onPress={() => sendMessage(label, qk)} style={styles.quickChip}><Text size={12} weight={500} color={C.fg2}>{label}</Text></Pressable>;
          })}
        </ScrollView>
        <View style={styles.composerRow}>
          <TextInput value={draftText} onChangeText={setDraftText} placeholder={t('deals.composer_placeholder')} placeholderTextColor={C.muted} maxLength={500} style={styles.input} />
          <Pressable accessibilityRole="button" accessibilityLabel="send message" disabled={!draftText.trim()} onPress={() => sendMessage(draftText)} style={[styles.sendBtn, !draftText.trim() && styles.sendDisabled]}>
            <Send size={18} color={C.fg} />
          </Pressable>
        </View>
      </View>

      <Sheet visible={sheetMode !== null} onClose={() => setSheetMode(null)} title={sheetMode === 'counter' ? t('deals.counter') : sheetMode === 'report' ? t('listing.report_title') : 'deal options'}>
        {sheetMode === 'menu' ? (
          <ListGroup>
            <ListRow title="view listing" onPress={() => { setSheetMode(null); if (deal?.listing?.id) router.push(`/listing/${deal.listing.id}` as never); }} />
            <ListRow title={t('profile.safety_tips')} onPress={() => { setSheetMode(null); router.push('/safety' as never); }} />
            {canFreeze ? <ListRow title={t('inspect.somethings_off_freeze')} destructive icon={<ShieldAlert size={18} color={C.danger} />} onPress={() => { setSheetMode(null); actionMut.mutate({ action: 'RAISE_DISPUTE', payload: { reason: 'dispute raised' } }); }} /> : null}
            <ListRow title={t('listing.report_title')} destructive onPress={() => setSheetMode('report')} />
          </ListGroup>
        ) : sheetMode === 'counter' ? (
          <View style={styles.sheetGap}>
            <TextInput value={counterInput} onChangeText={setCounterInput} keyboardType="numeric" placeholder="enter counter price" placeholderTextColor={C.muted} style={styles.input} />
            <NeoButton variant="paccha" label={t('deals.counter')} onPress={() => { const minor = parseMoneyInput(counterInput); if (minor > 0) { setSheetMode(null); actionMut.mutate({ action: 'COUNTER', payload: { amount_minor: minor } }); } }} />
          </View>
        ) : (
          <ListGroup>
            {(['scam', 'prohibited', 'wrong_info', 'offensive'] as const).map((reason) => (
              <ListRow key={reason} title={t(`listing.report_${reason}`)} onPress={async () => { setSheetMode(null); await mudraApi.report({ deal_id: id }, reason); showToast(t('listing.report_sent'), 'success'); }} />
            ))}
          </ListGroup>
        )}
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: C.hairline },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  headerThumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: C.card2 },
  headerText: { flex: 1 },
  topCards: { paddingHorizontal: 16, paddingTop: 10, gap: 8 },
  stripCard: { gap: 8 },
  stripTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  subActions: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 2 },
  msgList: { paddingHorizontal: 16, paddingVertical: 12 },
  specialCard: { marginVertical: 6, gap: 8 },
  evidenceImg: { width: '100%', height: 180, borderRadius: 12, backgroundColor: C.card3 },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomDock: { borderTopWidth: 1, borderTopColor: C.hairline, backgroundColor: C.bg, paddingTop: 8, gap: 8 },
  quickRow: { paddingHorizontal: 16, gap: 8 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: R.chip, backgroundColor: C.card2, borderWidth: 1, borderColor: C.border },
  composerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  input: { flex: 1, height: 46, backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, color: C.fg, fontFamily: F.ui, fontSize: 15 },
  sendBtn: { width: 46, height: 46, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  sheetGap: { gap: 14, paddingBottom: 12 },
});

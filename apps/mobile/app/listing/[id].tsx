import React, { useState } from 'react';
import {
  Dimensions, FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Image } from 'expo-image';
import * as Clipboard from 'expo-clipboard';
import { Flag, Heart, MapPin, Share2, ShieldCheck, Star, X } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import {
  useListing, useReport, useSetListingStatus, useStartDeal, useToggleSave,
} from '@/features/hooks';
import { formatMoney, parseMoneyInput } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import {
  AvatarRing, EmptyState, ListGroup, ListRow, NeoButton, Price,
  Sheet, Skeleton, StatusPill, Text, TopBar, VelvetCard, showToast,
} from '@/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const token = useSessionStore((s) => s.token);
  const me = useSessionStore((s) => s.me);

  const listingQuery = useListing(id);
  const toggleSave = useToggleSave();
  const startDeal = useStartDeal();
  const setStatus = useSetListingStatus();
  const reportMutation = useReport();

  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [offerSheetOpen, setOfferSheetOpen] = useState(false);
  const [swapSheetOpen, setSwapSheetOpen] = useState(false);
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [guestSheetOpen, setGuestSheetOpen] = useState(false);
  const [offerInput, setOfferInput] = useState('');
  const [swapInput, setSwapInput] = useState('');

  const listing = listingQuery.data;

  if (listingQuery.isLoading) {
    return (
      <View style={styles.screen}>
        <TopBar title="" />
        <View style={styles.pad}>
          <Skeleton height={SCREEN_WIDTH - 32} radius={24} />
          <Skeleton height={32} width="70%" style={styles.mt} />
          <Skeleton height={80} style={styles.mt} />
        </View>
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={styles.screen}>
        <TopBar title="" />
        <EmptyState title={t('errors.NOT_FOUND')} actionLabel={t('common.back')} onAction={() => router.back()} />
      </View>
    );
  }

  const photos = listing.photos?.length ? listing.photos : listing.photo ? [listing.photo] : [];
  const isOwner = Boolean(me?.id && me.id === listing.seller_id);
  const formattedPrice = formatMoney(listing.price_minor, listing.currency);

  const requireAuth = (fn: () => void) => {
    if (!token) {
      setGuestSheetOpen(true);
      return;
    }
    fn();
  };

  const handleStartDeal = async (amountMinor: number, swapOffer?: string) => {
    try {
      const deal = await startDeal.mutateAsync({
        listing_id: listing.id,
        amount_minor: amountMinor,
        swap_offer: swapOffer,
      });
      setOfferSheetOpen(false);
      setSwapSheetOpen(false);
      router.push(`/deal/${deal.id}` as never);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : t('errors.UNKNOWN'), 'danger');
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar
        title=""
        rightAction={
          <View style={styles.headerActions}>
            <Pressable onPress={() => requireAuth(() => toggleSave.mutate(listing.id))} style={styles.iconBtn}>
              <Heart size={18} color={listing.saved_by_me ? C.danger : C.fg} fill={listing.saved_by_me ? C.danger : 'transparent'} />
            </Pressable>
            <Pressable
              onPress={async () => {
                await Clipboard.setStringAsync(`mudra://listing/${listing.id}`);
                showToast(t('common.link_copied'), 'success');
              }}
              style={styles.iconBtn}
            >
              <Share2 size={18} color={C.fg} />
            </Pressable>
            <Pressable onPress={() => setReportSheetOpen(true)} style={styles.iconBtn}>
              <Flag size={18} color={C.muted} />
            </Pressable>
          </View>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.carouselWrap}>
          <FlatList
            data={photos}
            keyExtractor={(u, i) => `${u}-${i}`}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH))}
            renderItem={({ item: uri }) => (
              <Pressable onPress={() => setFullscreenOpen(true)}>
                <Image source={{ uri }} style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }} contentFit="cover" />
              </Pressable>
            )}
          />
          {photos.length > 1 ? (
            <View style={styles.dotsRow}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.bodyPad}>
          <Text variant="display" size={26} lineHeight={30}>{listing.title}</Text>
          <Price minor={listing.price_minor} currency={listing.currency} kind={listing.kind} variant="display" size={32} color={C.paccha} />

          <View style={styles.chipsRow}>
            <StatusPill tone="neutral" label={t(`conditions.${listing.condition}`)} />
            <StatusPill tone="neutral" label={t(`categories.${listing.category}`)} />
            {listing.meetup_spot ? (
              <View style={styles.spotChip}>
                <MapPin size={12} color={C.fg2} />
                <Text size={12} color={C.fg2}>{listing.meetup_spot}</Text>
              </View>
            ) : null}
          </View>

          {listing.description ? <Text size={15} lineHeight={22} color={C.fg2}>{listing.description}</Text> : null}

          <ListGroup>
            <ListRow
              left={<AvatarRing name={listing.seller?.name || 'Seller'} hue={listing.seller?.avatar_hue} size={40} />}
              title={listing.seller?.name || 'Seller'}
              subtitle={listing.seller?.campus || listing.campus || 'campus verified'}
              right={
                <View style={styles.ratingBadge}>
                  <Star size={14} color={C.paccha} fill={C.paccha} />
                  <Text weight={600} size={13} tabular>
                    {listing.seller?.rating ?? '5.0'} · {t('listing.deals_count', { count: listing.seller?.deals_done ?? 0 })}
                  </Text>
                </View>
              }
              onPress={() => router.push(`/seller/${listing.seller?.id || listing.seller_id}` as never)}
            />
          </ListGroup>

          <VelvetCard tone="card2" style={styles.protectionCard}>
            <View style={styles.protectionRow}>
              <ShieldCheck size={22} color={C.paccha} />
              <Text weight={700} size={15}>{t('listing.protection_title')}</Text>
            </View>
            <Text variant="secondary" size={13} lineHeight={19}>{t('listing.protection_body')}</Text>
          </VelvetCard>
        </View>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 14) }]}>
        {listing.my_open_deal_id ? (
          <NeoButton variant="purple" size="lg" label={t('listing.open_your_deal')} onPress={() => router.push(`/deal/${listing.my_open_deal_id}` as never)} />
        ) : isOwner ? (
          <View style={styles.rowGap}>
            <View style={styles.flex1}>
              <NeoButton variant="ghost" label={t('common.edit')} onPress={() => router.push(`/listing/new?edit=${listing.id}` as never)} />
            </View>
            <View style={styles.flex1}>
              <NeoButton variant="paccha" label={t('listing.mark_sold')} loading={setStatus.isPending} onPress={() => setStatus.mutate({ listingId: listing.id, status: 'sold' })} />
            </View>
          </View>
        ) : listing.status !== 'active' ? (
          <NeoButton variant="ghost" size="lg" label={listing.status} disabled />
        ) : listing.kind === 'sell' ? (
          <View style={styles.rowGap}>
            <View style={styles.flex1}>
              <NeoButton
                variant="ghost"
                size="lg"
                label={t('listing.make_offer')}
                onPress={() => requireAuth(() => {
                  setOfferInput(String(Math.round((listing.price_minor * 0.85) / 100)));
                  setOfferSheetOpen(true);
                })}
              />
            </View>
            <View style={styles.flex1}>
              <NeoButton variant="purple" size="lg" label={t('listing.buy_for', { price: formattedPrice })} loading={startDeal.isPending} onPress={() => requireAuth(() => handleStartDeal(listing.price_minor))} />
            </View>
          </View>
        ) : listing.kind === 'swap' ? (
          <NeoButton variant="purple" size="lg" label={t('listing.offer_swap')} onPress={() => requireAuth(() => setSwapSheetOpen(true))} />
        ) : (
          <NeoButton variant="purple" size="lg" label={t('listing.request_it')} loading={startDeal.isPending} onPress={() => requireAuth(() => handleStartDeal(0))} />
        )}
      </View>

      <Sheet visible={offerSheetOpen} onClose={() => setOfferSheetOpen(false)} title={t('listing.make_offer')}>
        <View style={styles.sheetGap}>
          <TextInput autoFocus keyboardType="decimal-pad" placeholder="amount" placeholderTextColor={C.dim} value={offerInput} onChangeText={setOfferInput} style={styles.input} />
          <NeoButton variant="purple" size="lg" label={t('common.submit')} loading={startDeal.isPending} onPress={() => { const minor = parseMoneyInput(offerInput); if (minor > 0) handleStartDeal(minor); }} />
        </View>
      </Sheet>

      <Sheet visible={swapSheetOpen} onClose={() => setSwapSheetOpen(false)} title={t('listing.offer_swap')}>
        <View style={styles.sheetGap}>
          <TextInput autoFocus placeholder={t('listing.what_will_you_swap')} placeholderTextColor={C.dim} value={swapInput} onChangeText={setSwapInput} style={styles.input} />
          <NeoButton variant="purple" size="lg" label={t('common.submit')} loading={startDeal.isPending} onPress={() => { if (swapInput.trim()) handleStartDeal(0, swapInput.trim()); }} />
        </View>
      </Sheet>

      <Sheet visible={guestSheetOpen} onClose={() => setGuestSheetOpen(false)} title={t('auth.guest_prompt_title')}>
        <View style={styles.sheetGap}>
          <Text variant="secondary" size={14}>{t('auth.guest_prompt_body')}</Text>
          <NeoButton variant="purple" size="lg" label={t('welcome.get_started')} onPress={() => { setGuestSheetOpen(false); router.push('/(auth)/signup/name' as never); }} />
        </View>
      </Sheet>

      <Sheet visible={reportSheetOpen} onClose={() => setReportSheetOpen(false)} title={t('listing.report_title')}>
        <ListGroup>
          {(['scam', 'prohibited', 'wrong_info', 'offensive'] as const).map((r) => (
            <ListRow
              key={r}
              title={t(`listing.report_${r}`)}
              onPress={async () => {
                await reportMutation.mutateAsync({ target: { listing_id: listing.id }, reason: r });
                setReportSheetOpen(false);
                showToast(t('listing.report_sent'), 'success');
              }}
            />
          ))}
        </ListGroup>
      </Sheet>

      <Modal visible={fullscreenOpen} transparent animationType="fade">
        <View style={styles.fullscreenBg}>
          <Pressable onPress={() => setFullscreenOpen(false)} style={[styles.closeFullscreen, { top: Math.max(insets.top + 12, 24) }]}>
            <X size={24} color={C.fg} />
          </Pressable>
          {photos[photoIndex] ? <Image source={{ uri: photos[photoIndex] }} style={styles.fullscreenImg} contentFit="contain" /> : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  pad: { padding: 16 },
  mt: { marginTop: 14 },
  headerActions: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.card2, borderWidth: 1, borderColor: C.hairline, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: 32 },
  carouselWrap: { position: 'relative' },
  dotsRow: { position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },
  dotActive: { width: 18, backgroundColor: C.paccha },
  bodyPad: { padding: 16, gap: 14 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  spotChip: { height: 24, paddingHorizontal: 10, borderRadius: R.chip, backgroundColor: C.card2, flexDirection: 'row', alignItems: 'center', gap: 4 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  protectionCard: { gap: 6 },
  protectionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bottomBar: { backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.hairline, paddingHorizontal: 16, paddingTop: 12 },
  rowGap: { flexDirection: 'row', gap: 10 },
  flex1: { flex: 1 },
  sheetGap: { gap: 14, paddingBottom: 12 },
  input: { height: 56, backgroundColor: C.card2, borderRadius: R.row, borderWidth: 1.5, borderColor: C.border, paddingHorizontal: 16, fontFamily: F.uiSemi, fontSize: 20, color: C.fg },
  fullscreenBg: { flex: 1, backgroundColor: C.void, alignItems: 'center', justifyContent: 'center' },
  closeFullscreen: { position: 'absolute', right: 20, zIndex: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: C.card2, alignItems: 'center', justifyContent: 'center' },
  fullscreenImg: { width: '100%', height: '80%' },
});

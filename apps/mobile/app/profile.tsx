import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react-native';
import { C, F } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { UpiIdSheet } from '@/features/profile/UpiIdSheet';
import { LANGUAGES } from '@/i18n';
import { maskPhone } from '@/lib/phone';
import { useMode, useSessionStore } from '@/state/mode';
import '@/types/upi';
import {
  AvatarRing,
  EmptyState,
  ListGroup,
  ListRow,
  NeoButton,
  PinPad,
  Sheet,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const token = useSessionStore((s) => s.token);
  const storeMe = useSessionStore((s) => s.me);
  const updateMe = useSessionStore((s) => s.updateMe);
  const logoutStore = useSessionStore((s) => s.logout);
  const locale = useSessionStore((s) => s.locale) ?? 'en';
  const { mode, setMode } = useMode();

  const [sheetMode, setSheetMode] = useState<'edit' | 'delete' | 'upi' | null>(null);
  const [nameInput, setNameInput] = useState(storeMe?.name || '');
  const [campusInput, setCampusInput] = useState(storeMe?.campus || '');
  const [bioInput, setBioInput] = useState(storeMe?.bio || '');
  const [deletePin, setDeletePin] = useState('');
  const [deleteErr, setDeleteErr] = useState<string | null>(null);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const fresh = await mudraApi.me();
      await updateMe(fresh);
      return fresh;
    },
    enabled: Boolean(token),
  });

  const me = meQuery.data ?? storeMe;

  const updateMut = useMutation({
    mutationFn: () =>
      mudraApi.updateProfile({
        name: nameInput.trim(),
        campus: campusInput.trim() || null,
        bio: bioInput.trim() || null,
      }),
    onSuccess: async (updated) => {
      await updateMe(updated);
      queryClient.setQueryData(['me'], updated);
      setSheetMode(null);
      showToast(t('common.done', 'done'), 'success');
    },
    onError: (err: Error) => showToast(err.message || t('errors.UNKNOWN'), 'danger'),
  });

  const resetDemoMut = useMutation({
    mutationFn: () => mudraApi.resetDemo(),
    onSuccess: () => {
      queryClient.invalidateQueries();
      showToast(t('profile.reset_demo_done', 'demo data reset.'), 'success');
    },
    onError: (err: Error) => showToast(err.message || t('errors.UNKNOWN'), 'danger'),
  });

  const handleLogout = async () => {
    try {
      await mudraApi.logout();
    } catch {
      // ignore network error on logout
    }
    await logoutStore();
    queryClient.clear();
    router.replace('/welcome' as never);
  };

  const handleDeleteAccount = async (pin: string) => {
    setDeleteErr(null);
    try {
      await mudraApi.deleteAccount(pin);
      setSheetMode(null);
      await logoutStore();
      queryClient.clear();
      router.replace('/welcome' as never);
    } catch (err) {
      setDeletePin('');
      setDeleteErr((err as Error)?.message || t('errors.BAD_PIN_GENERIC'));
    }
  };

  const openEditSheet = () => {
    if (!me) return;
    setNameInput(me.name || '');
    setCampusInput(me.campus || '');
    setBioInput(me.bio || '');
    setSheetMode('edit');
  };

  if (!token || !me) {
    return (
      <View style={styles.screen}>
        <TopBar title={t('profile.title', 'profile')} />
        <EmptyState
          title={t('auth.guest_prompt_title', 'create a free account to deal.')}
          body={t('auth.guest_prompt_body', 'create a free account to deal. takes 30 seconds.')}
          actionLabel={t('welcome.get_started', 'get started')}
          onAction={() => router.replace('/welcome' as never)}
        />
      </View>
    );
  }

  const ratingVal =
    typeof me.rating === 'number'
      ? me.rating.toFixed(1)
      : me.rating_count && me.rating_sum
        ? (me.rating_sum / me.rating_count).toFixed(1)
        : null;
  const langLabel = LANGUAGES.find((l) => l.code === locale)?.label || locale;

  return (
    <View style={styles.screen}>
      <TopBar title={t('profile.title', 'profile')} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom + 24, 36) }]}
        showsVerticalScrollIndicator={false}
      >
        <VelvetCard tone="card" style={styles.heroCard} onPress={openEditSheet}>
          <AvatarRing name={me.name} hue={me.avatar_hue} size={88} />
          <Text variant="display" size={26} color={C.fg} lowercase>{me.name}</Text>
          <Text variant="mono" size={12} color={C.muted}>{maskPhone(me.phone_e164)}</Text>
          {me.campus ? <Text variant="secondary" size={13} color={C.fg2}>{me.campus}</Text> : null}
          <View style={styles.statsPill}>
            {ratingVal ? (
              <View style={styles.rowInline}>
                <Star size={14} color={C.paccha} fill={C.paccha} />
                <Text weight={600} size={13} color={C.fg} tabular>{ratingVal}</Text>
                <Text size={13} color={C.muted}>·</Text>
              </View>
            ) : null}
            <Text weight={600} size={13} color={C.fg2} tabular>
              {t('listing.deals_count', { count: me.deals_done ?? 0 })}
            </Text>
          </View>
        </VelvetCard>

        <ListGroup title={t('profile.group_mode', 'MODE')}>
          <ListRow
            title={t('profile.selling_mode', 'selling mode')}
            showChevron={false}
            right={
              <Switch
                value={mode === 'sell'}
                onValueChange={(v) => setMode(v ? 'sell' : 'buy')}
                trackColor={{ false: C.card3, true: C.paccha }}
                thumbColor={mode === 'sell' ? C.bg : C.fg}
              />
            }
          />
        </ListGroup>

        <ListGroup title={t('profile.group_account', 'ACCOUNT')}>
          <ListRow title={t('profile.edit_profile', 'edit name, campus & bio')} onPress={openEditSheet} />
          <ListRow
            testID="profile-upi-row"
            title={t('profile.upi_id', 'upi id')}
            value={
              me.upi_id ? (
                <Text variant="mono" size={13} color={C.fg2}>
                  {me.upi_id}
                </Text>
              ) : (
                t('profile.upi_id_add', 'add')
              )
            }
            onPress={() => setSheetMode('upi')}
          />
          <ListRow title={t('profile.language', 'language')} value={langLabel} onPress={() => router.push('/settings/language' as never)} />
          <ListRow
            title={t('profile.currency', 'currency')}
            subtitle={t('profile.currency_note', 'listing prices use your currency')}
            value={me.currency || 'INR'}
            onPress={() => router.push('/settings/currency' as never)}
          />
        </ListGroup>

        <ListGroup title={t('profile.group_activity', 'ACTIVITY')}>
          <ListRow title={t('profile.my_listings', 'my listings')} onPress={() => router.push('/my-listings' as never)} />
          <ListRow title={t('profile.saved', 'saved')} onPress={() => router.push('/saved' as never)} />
          <ListRow title={t('wallet.title', 'wallet')} onPress={() => router.push('/wallet' as never)} />
          <ListRow title={t('profile.reviews_about_me', 'reviews about me')} onPress={() => router.push(`/seller/${me.id}` as never)} />
        </ListGroup>

        <ListGroup title={t('profile.group_help', 'HELP')}>
          <ListRow title={t('profile.how_it_works', 'how it works')} onPress={() => router.push('/guide' as never)} />
          <ListRow title={t('profile.safety_tips', 'safety tips')} onPress={() => router.push('/safety' as never)} />
          {me.is_demo_account ? (
            <ListRow title={t('profile.reset_demo', 'reset demo data')} onPress={() => resetDemoMut.mutate()} />
          ) : null}
          <ListRow title={t('profile.app_version', 'app version')} value="1.0.0" showChevron={false} />
        </ListGroup>

        <ListGroup title={t('profile.group_security', 'SECURITY')}>
          <ListRow title={t('profile.change_pin', 'change pin')} onPress={() => router.push('/settings/pin' as never)} />
          <ListRow title={t('profile.log_out', 'log out')} onPress={handleLogout} />
          <ListRow
            title={t('profile.delete_account', 'delete account')}
            destructive
            onPress={() => {
              setDeletePin('');
              setDeleteErr(null);
              setSheetMode('delete');
            }}
          />
        </ListGroup>
      </ScrollView>

      <Sheet
        visible={sheetMode === 'edit' || sheetMode === 'delete'}
        onClose={() => setSheetMode(null)}
        title={sheetMode === 'delete' ? t('profile.delete_confirm_title') : t('profile.edit_profile')}
      >
        {sheetMode === 'edit' ? (
          <View style={styles.sheetGap}>
            <TextInput value={nameInput} onChangeText={setNameInput} placeholder={t('auth.name_placeholder')} placeholderTextColor={C.muted} maxLength={40} style={styles.input} />
            <TextInput value={campusInput} onChangeText={setCampusInput} placeholder={t('listing.field_campus')} placeholderTextColor={C.muted} maxLength={60} style={styles.input} />
            <TextInput value={bioInput} onChangeText={setBioInput} placeholder="short bio (optional)" placeholderTextColor={C.muted} maxLength={200} style={styles.input} />
            <NeoButton variant={mode === 'sell' ? 'paccha' : 'purple'} label={t('common.save')} loading={updateMut.isPending} disabled={nameInput.trim().length < 2} onPress={() => updateMut.mutate()} />
          </View>
        ) : (
          <View style={styles.sheetGap}>
            <Text variant="secondary" size={13} color={C.muted} align="center">
              {t('profile.delete_confirm_body')}
            </Text>
            <PinPad value={deletePin} onChange={setDeletePin} onComplete={handleDeleteAccount} error={deleteErr} />
          </View>
        )}
      </Sheet>

      <UpiIdSheet
        visible={sheetMode === 'upi'}
        onClose={() => setSheetMode(null)}
        currentUpiId={me.upi_id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 22 },
  heroCard: { alignItems: 'center', gap: 6, paddingVertical: 22 },
  statsPill: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sheetGap: { gap: 14, paddingBottom: 14 },
  input: { height: 48, backgroundColor: C.card2, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 14, color: C.fg, fontFamily: F.ui, fontSize: 15 },
});

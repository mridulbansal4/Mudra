import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import { useSessionStore } from '@/state/session';
import type { CurrencyCode } from '@/types';
import { ListGroup, ListRow, Text, TopBar, VelvetCard, showToast } from '@/ui';

export default function CurrencySettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const me = useSessionStore((s) => s.me);
  const updateMe = useSessionStore((s) => s.updateMe);
  const currentCurrency: CurrencyCode = me?.currency || 'INR';

  const currencyMut = useMutation({
    mutationFn: (code: CurrencyCode) => mudraApi.updateProfile({ currency: code }),
    onSuccess: async (updated) => {
      await updateMe(updated);
      queryClient.setQueryData(['me'], updated);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      showToast(t('common.done', 'done'), 'success');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/profile' as never);
      }
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
    },
  });

  return (
    <View style={styles.screen}>
      <TopBar title={t('profile.currency', 'currency')} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <VelvetCard tone="card2" padding={14} radius={16}>
          <Text variant="secondary" size={13} color={C.fg2}>
            {t('profile.currency_note', 'listing prices use your currency')}
          </Text>
        </VelvetCard>

        <ListGroup>
          {SUPPORTED_CURRENCIES.map((item) => {
            const active = item.code === currentCurrency;
            return (
              <ListRow
                key={item.code}
                testID={`currency-option-${item.code}`}
                title={item.name}
                subtitle={item.code}
                showChevron={false}
                disabled={currencyMut.isPending}
                onPress={() => currencyMut.mutate(item.code)}
                right={
                  <View style={styles.rightCluster}>
                    <Text variant="mono" size={13} color={active ? C.paccha : C.muted}>
                      {item.symbol}
                    </Text>
                    {active ? <Check size={18} color={C.paccha} /> : null}
                  </View>
                }
              />
            );
          })}
        </ListGroup>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 16, gap: 18 },
  rightCluster: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});

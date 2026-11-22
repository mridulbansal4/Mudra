import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { mudraApi } from '@/features/api';
import { LANGUAGES } from '@/i18n';
import { useSessionStore } from '@/state/session';
import type { LocaleCode } from '@/types';
import { ListGroup, ListRow, Text, TopBar, showToast } from '@/ui';

export default function LanguageSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const token = useSessionStore((s) => s.token);
  const locale = useSessionStore((s) => s.locale) ?? 'en';
  const setLocale = useSessionStore((s) => s.setLocale);
  const updateMe = useSessionStore((s) => s.updateMe);

  const localeMut = useMutation({
    mutationFn: async (nextCode: LocaleCode) => {
      await setLocale(nextCode);
      if (token) {
        const updated = await mudraApi.updateProfile({ locale: nextCode });
        await updateMe(updated);
        queryClient.setQueryData(['me'], updated);
      }
    },
    onSuccess: () => {
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
      <TopBar title={t('profile.language', 'language')} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: Math.max(insets.bottom + 24, 36) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <ListGroup>
          {LANGUAGES.map((lang) => {
            const active = lang.code === locale;
            return (
              <ListRow
                key={lang.code}
                testID={`lang-option-${lang.code}`}
                title={lang.label}
                subtitle={lang.nativeLabel}
                showChevron={false}
                disabled={localeMut.isPending}
                onPress={() => localeMut.mutate(lang.code)}
                right={
                  <View style={styles.rightCluster}>
                    <Text variant="mono" size={12} color={active ? C.paccha : C.muted}>
                      {lang.short}
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

import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown } from 'lucide-react-native';
import { C, F, R } from '@/theme/tokens';
import {
  COUNTRIES,
  getCountryByCode,
  validateAndFormatE164,
} from '@/lib/phone';
import { useSessionStore } from '@/state/session';
import { ListGroup, ListRow, NeoButton, Sheet, Text, TopBar } from '@/ui';

export default function SignupPhoneScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const signupDraft = useSessionStore((s) => s.signupDraft);
  const setSignupDraft = useSessionStore((s) => s.setSignupDraft);

  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  const currentCountry = getCountryByCode(signupDraft.countryCode);
  const validation = useMemo(
    () =>
      validateAndFormatE164(
        signupDraft.nationalPhone,
        signupDraft.countryCode
      ),
    [signupDraft.nationalPhone, signupDraft.countryCode]
  );

  const filteredCountries = useMemo(() => {
    const q = countrySearch.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.dialCode.includes(q)
    );
  }, [countrySearch]);

  const handleContinue = () => {
    if (!validation.valid) return;
    setSignupDraft({ phoneE164: validation.e164 });
    router.push('/(auth)/signup/pin' as never);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <TopBar progressStage={3} />

      <View
        style={[
          styles.body,
          { paddingBottom: Math.max(insets.bottom + 16, 24) },
        ]}
      >
        <View style={styles.topContent}>
          <Text
            variant="display"
            size={34}
            lineHeight={38}
            color={C.fg}
            style={styles.heading}
          >
            {t('auth.phone_title')}
          </Text>

          <View style={styles.phoneRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('auth.select_country')}
              onPress={() => setCountrySheetOpen(true)}
              style={styles.countryBtn}
            >
              <Text weight={700} size={16} color={C.fg} tabular>
                {currentCountry.label}
              </Text>
              <ChevronDown size={16} strokeWidth={2} color={C.muted} />
            </Pressable>

            <TextInput
              autoFocus
              keyboardType="phone-pad"
              placeholder={t('auth.phone_placeholder')}
              placeholderTextColor={C.dim}
              value={signupDraft.nationalPhone}
              onChangeText={(text) => setSignupDraft({ nationalPhone: text })}
              onSubmitEditing={handleContinue}
              returnKeyType="next"
              style={styles.phoneInput}
            />
          </View>

          <Text variant="secondary" size={14} color={C.muted}>
            {t('auth.phone_helper')}
          </Text>
        </View>

        <NeoButton
          variant="purple"
          size="lg"
          label={t('common.continue')}
          disabled={!validation.valid}
          onPress={handleContinue}
        />
      </View>

      <Sheet
        visible={countrySheetOpen}
        onClose={() => setCountrySheetOpen(false)}
        title={t('auth.select_country')}
        scrollable
      >
        <TextInput
          placeholder={t('auth.search_country')}
          placeholderTextColor={C.dim}
          value={countrySearch}
          onChangeText={setCountrySearch}
          style={styles.searchInput}
        />

        <ListGroup style={styles.countryList}>
          {filteredCountries.map((c) => {
            const active = c.code === signupDraft.countryCode;
            return (
              <ListRow
                key={c.code}
                title={c.name.toLowerCase()}
                subtitle={c.label}
                showChevron={false}
                right={
                  active ? (
                    <Check size={18} strokeWidth={2.25} color={C.paccha} />
                  ) : null
                }
                onPress={() => {
                  setSignupDraft({ countryCode: c.code });
                  setCountrySheetOpen(false);
                }}
              />
            );
          })}
        </ListGroup>
      </Sheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    justifyContent: 'space-between',
  },
  topContent: {
    gap: 16,
  },
  heading: {
    textTransform: 'lowercase',
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 10,
  },
  countryBtn: {
    height: 60,
    paddingHorizontal: 14,
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1.5,
    borderColor: C.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  phoneInput: {
    flex: 1,
    height: 60,
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 18,
    fontFamily: F.uiSemi,
    fontSize: 20,
    color: C.fg,
  },
  searchInput: {
    height: 48,
    backgroundColor: C.card2,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    fontFamily: F.ui,
    fontSize: 15,
    color: C.fg,
    marginBottom: 12,
  },
  countryList: {
    marginBottom: 24,
  },
});

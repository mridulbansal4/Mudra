import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { C, F, R } from '@/theme/tokens';
import { useSessionStore } from '@/state/session';
import { NeoButton, Text, TopBar } from '@/ui';

export default function SignupNameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const signupDraft = useSessionStore((s) => s.signupDraft);
  const setSignupDraft = useSessionStore((s) => s.setSignupDraft);

  const trimmedName = signupDraft.name.trim();
  const isValid = trimmedName.length >= 2 && trimmedName.length <= 40;

  const handleContinue = () => {
    if (!isValid) return;
    setSignupDraft({ name: trimmedName });
    router.push('/(auth)/signup/role' as never);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      <TopBar progressStage={1} />

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
            {t('auth.name_title')}
          </Text>

          <TextInput
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={40}
            placeholder={t('auth.name_placeholder')}
            placeholderTextColor={C.dim}
            value={signupDraft.name}
            onChangeText={(text) => setSignupDraft({ name: text })}
            onSubmitEditing={handleContinue}
            returnKeyType="next"
            style={styles.input}
          />

          <Text variant="secondary" size={14} color={C.muted}>
            {t('auth.name_helper')}
          </Text>
        </View>

        <NeoButton
          variant="purple"
          size="lg"
          label={t('common.continue')}
          disabled={!isValid}
          onPress={handleContinue}
        />
      </View>
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
  input: {
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
});

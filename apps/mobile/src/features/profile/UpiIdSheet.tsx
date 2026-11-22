import React, { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { mudraApi } from '@/features/api';
import { UPI_ID_RE } from '@/lib/upi';
import { useSessionStore } from '@/state/session';
import { C, F, R, S } from '@/theme/tokens';
import '@/types/upi';
import { NeoButton, Sheet, showToast } from '@/ui';

export interface UpiIdSheetProps {
  visible: boolean;
  onClose: () => void;
  currentUpiId?: string | null;
}

export function UpiIdSheet({
  visible,
  onClose,
  currentUpiId,
}: UpiIdSheetProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const updateMe = useSessionStore((s) => s.updateMe);

  const [upiInput, setUpiInput] = useState(currentUpiId || '');

  useEffect(() => {
    if (visible) {
      setUpiInput((currentUpiId || '').toLowerCase());
    }
  }, [visible, currentUpiId]);

  const clean = upiInput.trim().toLowerCase();
  const isValid = clean === '' || UPI_ID_RE.test(clean);

  const saveMut = useMutation({
    mutationFn: () => mudraApi.setUpiId(clean || null),
    onSuccess: async (updated) => {
      await updateMe(updated);
      queryClient.setQueryData(['me'], updated);
      onClose();
      showToast(t('profile.upi_id_saved', 'upi id saved.'), 'success');
    },
    onError: (err: Error) => {
      showToast(err.message || t('errors.UNKNOWN'), 'danger');
    },
  });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={t('profile.upi_id', 'upi id')}
    >
      <View style={styles.body}>
        <TextInput
          testID="profile-upi-input"
          value={upiInput}
          onChangeText={(txt) => setUpiInput(txt.toLowerCase())}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('wallet.upi_id_placeholder', 'name@okaxis')}
          placeholderTextColor={C.muted}
          style={[styles.input, !isValid ? styles.invalid : null]}
        />

        <NeoButton
          testID="save-upi-btn"
          variant="purple"
          size="md"
          label={t('common.save', 'save')}
          disabled={!isValid || saveMut.isPending}
          loading={saveMut.isPending}
          onPress={() => saveMut.mutate()}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: S.md,
    paddingBottom: S.md,
  },
  input: {
    height: 48,
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: S.lg,
    color: C.fg,
    fontFamily: F.mono,
    fontSize: 15,
  },
  invalid: {
    borderColor: C.danger,
  },
});

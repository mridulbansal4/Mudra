import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Smartphone, Wallet } from 'lucide-react-native';
import { C, R, S } from '@/theme/tokens';
import { Text } from '@/ui';

export type EscrowPayMethod = 'wallet' | 'upi';

export interface PayMethodPickerProps {
  method: EscrowPayMethod;
  onChange: (method: EscrowPayMethod) => void;
  balanceFormatted: string;
}

export function PayMethodPicker({
  method,
  onChange,
  balanceFormatted,
}: PayMethodPickerProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: method === 'wallet' }}
        accessibilityLabel={t('escrow.mudra_wallet', 'mudra wallet')}
        onPress={() => onChange('wallet')}
        style={[
          styles.row,
          method === 'wallet' ? styles.selectedWallet : styles.unselected,
        ]}
      >
        <View style={styles.iconCircle}>
          <Wallet size={18} color={method === 'wallet' ? C.paccha : C.fg2} />
        </View>
        <View style={styles.center}>
          <Text weight={600} size={15} color={C.fg} lowercase>
            {t('escrow.mudra_wallet', 'mudra wallet')}
          </Text>
          <Text variant="secondary" size={13} color={C.muted} tabular>
            {balanceFormatted}
          </Text>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ selected: method === 'upi' }}
        accessibilityLabel={t('escrow.upi_app', 'upi app')}
        onPress={() => onChange('upi')}
        style={[
          styles.row,
          method === 'upi' ? styles.selectedUpi : styles.unselected,
        ]}
      >
        <View style={styles.iconCircle}>
          <Smartphone size={18} color={method === 'upi' ? C.purple : C.fg2} />
        </View>
        <View style={styles.center}>
          <Text weight={600} size={15} color={C.fg} lowercase>
            {t('escrow.upi_app', 'upi app')}
          </Text>
          <Text variant="secondary" size={13} color={C.muted}>
            {t('escrow.upi_app_sub', 'gpay · phonepe · paytm · bhim')}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: S.sm,
  },
  row: {
    minHeight: 58,
    paddingHorizontal: S.lg,
    paddingVertical: S.sm,
    borderRadius: R.row,
    backgroundColor: C.card2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.md,
  },
  unselected: {
    borderWidth: 1,
    borderColor: C.hairline,
  },
  selectedWallet: {
    borderWidth: 2,
    borderColor: C.paccha,
  },
  selectedUpi: {
    borderWidth: 2,
    borderColor: C.purple,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.card3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.hairline,
  },
  center: {
    flex: 1,
    gap: 2,
  },
});

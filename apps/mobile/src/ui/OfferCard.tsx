import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { C, R } from '@/theme/tokens';
import { formatMoney } from '@/lib/money';
import { Eyebrow } from './Eyebrow';
import { NeoButton } from './NeoButton';
import { Text } from './Text';

export interface OfferCardProps {
  amountMinor: number;
  currency: string;
  swapOffer?: string | null;
  byMe: boolean;
  canRespond: boolean;
  statusLabel?: string;
  onAccept?: () => void;
  onCounter?: () => void;
  onDecline?: () => void;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function OfferCard({
  amountMinor,
  currency,
  swapOffer,
  byMe,
  canRespond,
  statusLabel,
  onAccept,
  onCounter,
  onDecline,
  loading = false,
  style,
}: OfferCardProps) {
  const formattedPrice =
    amountMinor > 0 ? formatMoney(amountMinor, currency) : swapOffer ? 'swap' : 'free';

  return (
    <View style={[styles.card, style]}>
      <Eyebrow
        label={byMe ? 'YOUR OFFER' : 'OFFER'}
        dot
        dotColor={C.paccha}
        right={
          statusLabel ? (
            <Text variant="eyebrow" size={10} color={C.muted}>
              {statusLabel}
            </Text>
          ) : null
        }
      />

      <Text
        variant="display"
        size={32}
        lineHeight={36}
        tabular
        color={C.fg}
        style={styles.amount}
      >
        {formattedPrice}
      </Text>

      {swapOffer ? (
        <View style={styles.swapBox}>
          <Text size={13} color={C.fg2}>
            swap offer: {swapOffer}
          </Text>
        </View>
      ) : null}

      {canRespond ? (
        <View style={styles.actions}>
          <View style={styles.primaryActions}>
            {onAccept ? (
              <View style={styles.flexBtn}>
                <NeoButton
                  variant="paccha"
                  size="md"
                  label="accept"
                  onPress={onAccept}
                  loading={loading}
                />
              </View>
            ) : null}
            {onCounter ? (
              <View style={styles.flexBtn}>
                <NeoButton
                  variant="ghost"
                  size="md"
                  label="counter"
                  onPress={onCounter}
                  disabled={loading}
                />
              </View>
            ) : null}
          </View>

          {onDecline ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="decline offer"
              disabled={loading}
              onPress={onDecline}
              style={styles.declineBtn}
            >
              <Text size={13} weight={600} color={C.muted}>
                decline
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        <Text variant="secondary" size={12} color={C.muted}>
          {byMe ? 'waiting for response' : 'offer updated'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.card2,
    borderRadius: R.row,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginVertical: 6,
    gap: 10,
  },
  amount: {
    marginTop: 2,
  },
  swapBox: {
    backgroundColor: C.card3,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actions: {
    marginTop: 4,
    gap: 10,
  },
  primaryActions: {
    flexDirection: 'row',
    gap: 10,
  },
  flexBtn: {
    flex: 1,
  },
  declineBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
});

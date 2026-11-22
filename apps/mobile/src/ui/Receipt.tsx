import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { BadgeCheck, Copy } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { ListingKind } from '@/types';
import { formatMoney } from '@/lib/money';
import { Price } from './Price';
import { Stamp } from './Stamp';
import { Text } from './Text';
import { showToast } from './Toast';

export interface ReceiptRowItem {
  label: string;
  value: string;
  mono?: boolean;
}

export interface ReceiptProps {
  shortCode: string;
  itemTitle: string;
  amountMinor: number;
  currency?: string;
  kind?: ListingKind;
  sellerName: string;
  buyerName: string;
  voucherHash?: string | null;
  timestamp?: string | null;
  released?: boolean;
  stampLabel?: string;
  extraRows?: ReceiptRowItem[];
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

function buildZigzagPath(width: number, teethCount = 24, height = 8, top = true): string {
  const step = width / teethCount;
  let d = top ? `M 0 ${height}` : `M 0 0`;
  for (let i = 0; i < teethCount; i++) {
    const midX = (i + 0.5) * step;
    const endX = (i + 1) * step;
    if (top) {
      d += ` L ${midX.toFixed(1)} 0 L ${endX.toFixed(1)} ${height}`;
    } else {
      d += ` L ${midX.toFixed(1)} ${height} L ${endX.toFixed(1)} 0`;
    }
  }
  d += ' Z';
  return d;
}

export function Receipt({
  shortCode,
  itemTitle,
  amountMinor,
  currency = 'INR',
  kind = 'sell',
  sellerName,
  buyerName,
  voucherHash,
  timestamp,
  released = false,
  stampLabel = 'RELEASED',
  extraRows,
  children,
  style,
}: ReceiptProps) {
  const shortHash = voucherHash
    ? voucherHash.slice(0, 16)
    : `ed25519·${shortCode.toLowerCase()}`;

  const handleCopyHash = async () => {
    const textToCopy = voucherHash || shortCode;
    await Clipboard.setStringAsync(textToCopy);
    Haptics.selectionAsync().catch(() => {});
    showToast('voucher hash copied', 'success');
  };

  return (
    <View style={[styles.outer, style]}>
      <Svg width="100%" height={8} viewBox="0 0 360 8" preserveAspectRatio="none">
        <Path d={buildZigzagPath(360, 24, 8, true)} fill={C.card} />
      </Svg>

      <View style={styles.body}>
        <View style={styles.topHeader}>
          <View style={styles.sealBadge}>
            <BadgeCheck size={24} strokeWidth={1.75} color={C.paccha} />
            <Text variant="eyebrow" size={11} color={C.paccha}>
              MUDRA ESCROW VOUCHER
            </Text>
          </View>
          <Text variant="mono" size={12} color={C.muted}>
            {shortCode}
          </Text>
        </View>

        <View style={styles.amountBlock}>
          <Price
            minor={amountMinor}
            currency={currency}
            kind={kind}
            variant="display"
            size={40}
            color={C.fg}
          />
          <Text weight={500} size={15} color={C.fg2} numberOfLines={2}>
            {itemTitle}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.rows}>
          <View style={styles.row}>
            <Text variant="secondary" size={13} color={C.muted}>
              buyer
            </Text>
            <Text weight={600} size={14} color={C.fg}>
              {buyerName}
            </Text>
          </View>

          <View style={styles.row}>
            <Text variant="secondary" size={13} color={C.muted}>
              seller
            </Text>
            <Text weight={600} size={14} color={C.fg}>
              {sellerName}
            </Text>
          </View>

          <View style={styles.row}>
            <Text variant="secondary" size={13} color={C.muted}>
              amount
            </Text>
            <Text weight={600} size={14} color={C.fg} tabular>
              {kind === 'free'
                ? 'free'
                : kind === 'swap' && amountMinor <= 0
                ? 'swap'
                : formatMoney(amountMinor, currency)}
            </Text>
          </View>

          {extraRows?.map((r, i) => (
            <View key={i} style={styles.row}>
              <Text variant="secondary" size={13} color={C.muted}>
                {r.label}
              </Text>
              <Text
                variant={r.mono ? 'mono' : 'body'}
                weight={600}
                size={r.mono ? 12 : 14}
                color={C.fg2}
                tabular
              >
                {r.value}
              </Text>
            </View>
          ))}

          <View style={styles.row}>
            <Text variant="secondary" size={13} color={C.muted}>
              voucher hash
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="copy voucher hash"
              onPress={handleCopyHash}
              style={styles.hashBtn}
            >
              <Text variant="mono" size={12} color={C.paccha}>
                {shortHash}
              </Text>
              <Copy size={13} strokeWidth={1.75} color={C.paccha} />
            </Pressable>
          </View>

          {timestamp ? (
            <View style={styles.row}>
              <Text variant="secondary" size={13} color={C.muted}>
                timestamp
              </Text>
              <Text variant="mono" size={11} color={C.muted} tabular>
                {timestamp}
              </Text>
            </View>
          ) : null}
        </View>

        {released ? (
          <View style={styles.stampArea}>
            <Stamp label={stampLabel} visible={released} />
          </View>
        ) : null}

        {children ? <View style={styles.footerSlot}>{children}</View> : null}
      </View>

      <Svg width="100%" height={8} viewBox="0 0 360 8" preserveAspectRatio="none">
        <Path d={buildZigzagPath(360, 24, 8, false)} fill={C.card} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '100%',
  },
  body: {
    backgroundColor: C.card,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sealBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountBlock: {
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: C.hairline,
  },
  rows: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  hashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  stampArea: {
    marginTop: 4,
  },
  footerSlot: {
    marginTop: 6,
  },
});

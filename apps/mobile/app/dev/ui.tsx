import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ShieldCheck, Sparkles, Vault } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import {
  AvatarRing,
  BilingualBubble,
  BottomBar,
  CountdownRing,
  EmptyState,
  Eyebrow,
  HudBrackets,
  IconTile,
  ListGroup,
  ListRow,
  LogoMark,
  NeoButton,
  OfferCard,
  PinPad,
  Price,
  ProgressSegments,
  Receipt,
  SegmentedControl,
  Sheet,
  Skeleton,
  SlideToLock,
  StatusPill,
  SystemLine,
  Text,
  TopBar,
  VelvetCard,
  showToast,
} from '@/ui';

export default function DevUiGalleryScreen() {
  const [seg, setSeg] = useState<'buy' | 'sell'>('buy');
  const [pin, setPin] = useState('12');
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <View style={styles.screen}>
      <TopBar title="ui gallery" subtitle="neopop primitives" />

      <ScrollView contentContainerStyle={styles.scroll}>
        <Eyebrow label="BRAND & TYPOGRAPHY" dot />
        <VelvetCard style={styles.sectionCard}>
          <View style={styles.rowBetween}>
            <LogoMark size={40} />
            <AvatarRing name="Rajesh Natarajan" size={48} showBadge />
            <Price minor={145000} currency="INR" variant="display" size={28} />
          </View>
          <Text variant="display" size={28}>
            trade like you trust them.
          </Text>
          <Text variant="secondary">
            every rupee waits in a sealed vault until you verify the item live.
          </Text>
          <Text variant="mono">MD-2611-0042 · ed25519·9f3a2c1e</Text>
        </VelvetCard>

        <Eyebrow label="NEOPOP BUTTONS" dot />
        <View style={styles.stack}>
          <NeoButton
            variant="purple"
            size="lg"
            label="lock money in escrow"
            onPress={() => showToast('purple button pressed', 'success')}
          />
          <NeoButton
            variant="paccha"
            size="md"
            label="looks good — mark verified"
            onPress={() => showToast('paccha button pressed', 'success')}
          />
          <View style={styles.rowGap}>
            <View style={styles.flex1}>
              <NeoButton
                variant="white"
                size="md"
                label="white"
                onPress={() => setSheetOpen(true)}
              />
            </View>
            <View style={styles.flex1}>
              <NeoButton
                variant="ghost"
                size="md"
                label="open sheet"
                onPress={() => setSheetOpen(true)}
              />
            </View>
            <View style={styles.flex1}>
              <NeoButton
                variant="danger"
                size="md"
                label="freeze"
                onPress={() => showToast('deal frozen', 'danger')}
              />
            </View>
          </View>
        </View>

        <Eyebrow label="CONTROLS & PILLS" dot />
        <SegmentedControl
          value={seg}
          onChange={setSeg}
          options={[
            { value: 'buy', label: 'buy' },
            { value: 'sell', label: 'sell' },
          ]}
        />
        <View style={styles.pillRow}>
          <StatusPill tone="locked" label="IN ESCROW" />
          <StatusPill tone="live" label="LIVE CHECK" />
          <StatusPill tone="frozen" label="FROZEN" />
          <StatusPill tone="done" label="RELEASED" />
          <StatusPill tone="danger" label="DECLINED" />
        </View>
        <ProgressSegments stage={3} total={4} />

        <Eyebrow label="TILES & LIST GROUP" dot />
        <View style={styles.rowBetween}>
          <IconTile
            icon={<Vault size={22} color={C.fg} />}
            label="vault"
            active
          />
          <IconTile
            icon={<ShieldCheck size={22} color={C.fg} />}
            label="escrow"
            badge="0 fee"
          />
          <IconTile
            icon={<Sparkles size={22} color={C.fg} />}
            label="live check"
          />
        </View>

        <ListGroup title="YOUR MONEY">
          <ListRow
            title="in escrow"
            subtitle="protected deals"
            value="₹950"
            onPress={() => {}}
          />
          <ListRow
            title="live deals"
            subtitle="needs your check"
            value="2"
            onPress={() => {}}
          />
        </ListGroup>

        <Eyebrow label="SLIDE TO LOCK" dot />
        <SlideToLock
          label="slide to lock money"
          onComplete={() => showToast('locked in escrow', 'success')}
        />

        <Eyebrow label="CHAT & OFFERS" dot />
        <SystemLine text="money locked in escrow" />
        <BilingualBubble
          mine={false}
          text="क्या यह अभी भी उपलब्ध है?"
          translated="is this still available?"
          senderLang="hi"
          timestamp="2m ago"
        />
        <BilingualBubble
          mine
          text="yes, meet at library gate?"
          timestamp="just now"
        />
        <OfferCard
          amountMinor={550000}
          currency="INR"
          byMe={false}
          canRespond
          onAccept={() => showToast('accepted', 'success')}
          onCounter={() => showToast('counter', 'neutral')}
          onDecline={() => showToast('declined', 'danger')}
        />

        <Eyebrow label="RESOLUTION RING & HUD" dot />
        <View style={styles.center}>
          <CountdownRing endsAt={Date.now() + 74000} total={90} size={180} />
        </View>
        <HudBrackets style={styles.hudDemo}>
          <Text variant="secondary" align="center">
            live check camera hud
          </Text>
        </HudBrackets>

        <Eyebrow label="RECEIPT & STAMP" dot />
        <Receipt
          shortCode="MD-2611-0042"
          itemTitle="casio fx-991ex scientific calculator"
          amountMinor={95000}
          currency="INR"
          buyerName="Rajesh Natarajan"
          sellerName="Priya Nair"
          voucherHash="9f3a8b21c4e0d712a98b"
          released
        />

        <Eyebrow label="PIN PAD & SKELETON" dot />
        <PinPad value={pin} onChange={setPin} />
        <Skeleton height={48} radius={16} />
        <EmptyState
          title="nothing here yet."
          body="empty state preview with action button."
          actionLabel="explore"
          onAction={() => {}}
        />
      </ScrollView>

      <BottomBar activeTab="home" badgeCount={2} />

      <Sheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="escrow preview"
      >
        <Text variant="secondary" style={styles.sheetText}>
          in-tree bottom sheet with drag handle and backdrop.
        </Text>
        <NeoButton
          variant="paccha"
          label="got it"
          onPress={() => setSheetOpen(false)}
        />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scroll: {
    padding: 16,
    gap: 16,
    paddingBottom: 48,
  },
  sectionCard: {
    gap: 10,
  },
  stack: {
    gap: 12,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap: {
    flexDirection: 'row',
    gap: 10,
  },
  flex1: {
    flex: 1,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  center: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  hudDemo: {
    height: 120,
    backgroundColor: C.card2,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetText: {
    marginBottom: 16,
  },
});

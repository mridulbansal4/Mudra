import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Languages } from 'lucide-react-native';
import { C } from '@/theme/tokens';
import { Text } from './Text';

export interface BilingualBubbleProps {
  mine: boolean;
  text: string;
  translated?: string | null;
  senderLang?: string;
  timestamp?: string;
  showOriginal?: boolean;
  onRequestTranslate?: () => void;
  translating?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BilingualBubble({
  mine,
  text,
  translated,
  senderLang,
  timestamp,
  showOriginal: initialShowOriginal = true,
  onRequestTranslate,
  translating = false,
  style,
}: BilingualBubbleProps) {
  const [showOriginal, setShowOriginal] = useState(initialShowOriginal);
  const hasTranslation = Boolean(
    translated && translated.trim() && translated.trim() !== text.trim()
  );

  const primaryText = hasTranslation ? translated! : text;

  return (
    <View
      style={[
        styles.row,
        mine ? styles.rowMine : styles.rowOther,
        style,
      ]}
    >
      <View
        style={[
          styles.bubble,
          mine ? styles.bubbleMine : styles.bubbleOther,
        ]}
      >
        <Text
          weight={500}
          size={15}
          lineHeight={21}
          color={C.fg}
        >
          {primaryText}
        </Text>

        {hasTranslation ? (
          <View style={styles.translationBlock}>
            <View
              style={[
                styles.divider,
                mine ? styles.dividerMine : styles.dividerOther,
              ]}
            />
            {showOriginal ? (
              <Text
                size={12}
                lineHeight={16}
                color={mine ? 'rgba(255,255,255,0.75)' : C.muted}
                style={styles.originalText}
              >
                {text}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="toggle original text"
              onPress={() => setShowOriginal((v) => !v)}
              style={styles.metaRow}
            >
              <Languages
                size={12}
                strokeWidth={1.75}
                color={mine ? 'rgba(255,255,255,0.75)' : C.muted}
              />
              <Text
                size={11}
                weight={500}
                color={mine ? 'rgba(255,255,255,0.75)' : C.muted}
              >
                {showOriginal ? 'original shown' : 'show original'}
              </Text>
            </Pressable>
          </View>
        ) : !mine && onRequestTranslate ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="translate message"
            disabled={translating}
            onPress={onRequestTranslate}
            style={styles.translateBtn}
          >
            {translating ? (
              <ActivityIndicator size="small" color={C.muted} />
            ) : (
              <>
                <Languages size={12} strokeWidth={1.75} color={C.muted} />
                <Text size={11} weight={500} color={C.muted}>
                  {senderLang ? `translate (${senderLang})` : 'translate'}
                </Text>
              </>
            )}
          </Pressable>
        ) : null}

        {timestamp ? (
          <Text
            size={10}
            color={mine ? 'rgba(255,255,255,0.65)' : C.dim}
            align="right"
            style={styles.timestamp}
          >
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    marginVertical: 4,
    flexDirection: 'row',
  },
  rowMine: {
    justifyContent: 'flex-end',
  },
  rowOther: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMine: {
    backgroundColor: C.purple,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: C.card2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 20,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  translationBlock: {
    marginTop: 6,
  },
  divider: {
    height: 1,
    marginBottom: 6,
  },
  dividerMine: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  dividerOther: {
    backgroundColor: C.hairline,
  },
  originalText: {
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  translateBtn: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestamp: {
    marginTop: 4,
  },
});

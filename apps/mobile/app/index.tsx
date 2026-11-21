import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Description, Input, Label, TextField } from 'heroui-native';
import { supabase } from '@/lib/supabase';
import { BRAND } from '@/config/brand';
import { C, F, R, S } from '@/theme/tokens';

export default function P0GateScreen() {
  const [sampleText, setSampleText] = useState('mudra campus escrow');
  const [pingStatus, setPingStatus] = useState<'loading' | 'ok' | 'error'>('loading');
  const [serverNow, setServerNow] = useState<string>('');
  const [errorDetail, setErrorDetail] = useState<string>('');

  useEffect(() => {
    let mounted = true;
    const runPing = async () => {
      try {
        const { data, error } = await supabase.rpc('m_ping');
        if (!mounted) return;
        if (error) {
          setPingStatus('error');
          setErrorDetail(error.message);
        } else if (data && data.ok) {
          setPingStatus('ok');
          setServerNow(String(data.server_now ?? ''));
        } else {
          setPingStatus('ok');
          setServerNow(JSON.stringify(data));
        }
      } catch (err) {
        if (!mounted) return;
        setPingStatus('error');
        setErrorDetail(err instanceof Error ? err.message : 'network error');
      }
    };

    runPing();
    const timer = setInterval(() => {
      if (pingStatus !== 'ok') {
        runPing();
      }
    }, 2500);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [pingStatus]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container} className="flex-1 px-6 py-8">
        <View style={styles.eyebrowRow}>
          <View style={styles.dot} />
          <Text style={styles.eyebrow}>PHASE P0 RELEASE GATE</Text>
        </View>

        <Text style={styles.heading}>
          {BRAND.name} escrow is live.
        </Text>

        <Text style={styles.body}>
          buy and sell on campus, without the fear. custom fonts, uniwind, heroui native, and supabase rpc verified in release mode.
        </Text>

        <View style={styles.card}>
          <TextField className="gap-2">
            <Label>what should we call you?</Label>
            <Input
              value={sampleText}
              onChangeText={setSampleText}
              placeholder="enter display name"
            />
            <Description>heroui native textfield + uniwind styling active.</Description>
          </TextField>
        </View>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>SUPABASE RPC M_PING</Text>
          <Text
            style={[
              styles.pingResult,
              pingStatus === 'ok'
                ? styles.pingOk
                : pingStatus === 'error'
                  ? styles.pingErr
                  : styles.pingWait,
            ]}
          >
            {pingStatus === 'ok'
              ? 'ping ok'
              : pingStatus === 'loading'
                ? 'connecting...'
                : `ping error: ${errorDetail}`}
          </Text>
          <Text style={styles.mono}>
            {serverNow ? `server_now: ${serverNow}` : 'code: MD-2611-0001 · font: JetBrainsMono_500Medium'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.bg,
  },
  container: {
    flex: 1,
    backgroundColor: C.bg,
    paddingHorizontal: S.xl,
    paddingTop: S.xl,
    gap: S.lg,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: S.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.paccha,
  },
  eyebrow: {
    fontFamily: F.uiSemi,
    fontSize: 11,
    letterSpacing: 1.1,
    color: C.muted,
    textTransform: 'uppercase',
  },
  heading: {
    fontFamily: F.display,
    fontSize: 36,
    lineHeight: 40,
    color: C.fg,
  },
  body: {
    fontFamily: F.ui,
    fontSize: 16,
    lineHeight: 23,
    color: C.fg2,
  },
  card: {
    backgroundColor: C.card,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.hairline,
    padding: S.lg,
  },
  statusCard: {
    backgroundColor: C.card2,
    borderRadius: R.card,
    borderWidth: 1,
    borderColor: C.border,
    padding: S.lg,
    gap: S.xs,
  },
  statusLabel: {
    fontFamily: F.uiSemi,
    fontSize: 11,
    letterSpacing: 1.0,
    color: C.muted,
  },
  pingResult: {
    fontFamily: F.display,
    fontSize: 28,
    lineHeight: 34,
  },
  pingOk: {
    color: C.paccha,
  },
  pingWait: {
    color: C.sunshine,
  },
  pingErr: {
    color: C.danger,
  },
  mono: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.fg2,
    fontVariant: ['tabular-nums'],
  },
});

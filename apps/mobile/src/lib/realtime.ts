import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { onlineManager, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface MudraRealtimeEvent {
  id: number;
  recipient_id: string;
  deal_id?: string | null;
  kind: string;
  created_at: string;
}

let netInfoWired = false;

/**
 * Wires @react-native-community/netinfo into React Query's onlineManager (§9.3).
 */
export function ensureOnlineManagerWired(): void {
  if (netInfoWired) return;
  netInfoWired = true;
  onlineManager.setEventListener((setOnline) => {
    return NetInfo.addEventListener((state) => {
      setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
  });
}

/**
 * Hook returning current connectivity boolean for the top offline banner (§9.3).
 */
export function useNetworkStatus(): { isOffline: boolean } {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    ensureOnlineManagerWired();
    const unsub = NetInfo.addEventListener((state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(!online);
    });
    return () => unsub();
  }, []);

  return { isOffline };
}

let subSeq = 0;

/**
 * Subscribes to `public.m_events` for `myId` and invalidates affected React Query caches (§3 ADR-M6, §9.1).
 */
export function subscribeEvents(myId: string, queryClient: QueryClient): () => void {
  subSeq += 1;
  const channelName = `events:${myId}:${subSeq}`;
  const channel = supabase.channel(channelName);
  try {
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'm_events',
          filter: `recipient_id=eq.${myId}`,
        },
        (payload) => {
          const ev = payload.new as Partial<MudraRealtimeEvent> | undefined;
          const dealId = ev?.deal_id;

          if (dealId) {
            queryClient.invalidateQueries({ queryKey: ['deal', dealId] });
            queryClient.invalidateQueries({ queryKey: ['messages', dealId] });
          } else {
            queryClient.invalidateQueries({ queryKey: ['deal'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
          }

          queryClient.invalidateQueries({ queryKey: ['deals'] });
          queryClient.invalidateQueries({ queryKey: ['me'] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
          queryClient.invalidateQueries({ queryKey: ['feed'] });
        }
      )
      .subscribe();
  } catch {
    // Fallback polling covers any realtime channel error
  }

  return () => {
    try {
      void supabase.removeChannel(channel);
    } catch {
      // Ignore cleanup errors
    }
  };
}

/**
 * React hook that maintains the Supabase Realtime subscription for `myId`
 * and reconnects + refreshes queries when AppState transitions to 'active'.
 */
export function useRealtimeEvents(myId?: string | null): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    ensureOnlineManagerWired();
    if (!myId) return;

    let cleanup = subscribeEvents(myId, queryClient);

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        cleanup();
        cleanup = subscribeEvents(myId, queryClient);
        queryClient.invalidateQueries({ queryKey: ['me'] });
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['deal'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);
    return () => {
      sub.remove();
      cleanup();
    };
  }, [myId, queryClient]);
}

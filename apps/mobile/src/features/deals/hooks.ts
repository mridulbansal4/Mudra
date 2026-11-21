import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from '@/i18n';
import { isMudraError } from '@/lib/errors';
import { newIdemKey } from '@/lib/idem';
import { useSessionStore } from '@/state/session';
import { showToast } from '@/ui/Toast';
import { mudraApi, type StartDealParams } from '@/features/api';
import type { Deal, DealAction, DealSummary } from '@/types';

export function useStartDeal() {
  const queryClient = useQueryClient();
  const idemRef = useRef<string>(newIdemKey());

  return useMutation({
    mutationFn: async (params: StartDealParams) => {
      const idem = params.idem ?? idemRef.current;
      const deal = await mudraApi.startDeal({ ...params, idem });
      idemRef.current = newIdemKey();
      return deal;
    },
    onSuccess: (deal) => {
      queryClient.setQueryData(['deal', deal.id], deal);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['listing', deal.listing?.id] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useDeals(
  role: 'buyer' | 'seller' | 'all' = 'all',
  options?: { enabled?: boolean; refetchInterval?: number | false }
) {
  const token = useSessionStore((s) => s.token);
  const enabled = (options?.enabled ?? true) && Boolean(token);

  return useQuery<DealSummary[]>({
    queryKey: ['deals', role, token],
    queryFn: () => mudraApi.deals(role),
    enabled,
    staleTime: 8_000,
    refetchInterval: options?.refetchInterval ?? 15_000,
    refetchIntervalInBackground: false,
  });
}

/**
 * Fetches a single deal, polls every 4s while active, and automatically ticks
 * the server demo bot (`m_demo_tick`) every 3s when `counterpart.is_demo_bot` is true (§8.6 & §9.1).
 */
export function useDeal(
  dealId?: string | null,
  options?: { enabled?: boolean; pollIntervalMs?: number; enableBotTick?: boolean }
) {
  const token = useSessionStore((s) => s.token);
  const queryClient = useQueryClient();
  const enabled = (options?.enabled ?? true) && Boolean(token && dealId);

  const query = useQuery<Deal>({
    queryKey: ['deal', dealId],
    queryFn: () => mudraApi.deal(dealId as string),
    enabled,
    staleTime: 3_000,
    refetchInterval: options?.pollIntervalMs ?? 4_000,
    refetchIntervalInBackground: false,
  });

  const isBot = Boolean(query.data?.counterpart?.is_demo_bot);
  const dealState = query.data?.state;
  const shouldTickBot =
    enabled &&
    (options?.enableBotTick ?? true) &&
    isBot &&
    dealState !== undefined &&
    dealState !== 'DECLINED' &&
    dealState !== 'CANCELLED';

  useEffect(() => {
    if (!shouldTickBot || !dealId) return;

    const timer = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      try {
        const updated = await mudraApi.demoTick(dealId);
        if (updated && updated.id) {
          queryClient.setQueryData(['deal', dealId], updated);
          queryClient.invalidateQueries({ queryKey: ['messages', dealId] });
          queryClient.invalidateQueries({ queryKey: ['deals'] });
          queryClient.invalidateQueries({ queryKey: ['me'] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }
      } catch {
        // ignore transient bot tick errors
      }
    }, 3_000);

    return () => clearInterval(timer);
  }, [shouldTickBot, dealId, queryClient]);

  return query;
}

export interface DealActionMutationInput {
  deal_id?: string;
  action: DealAction;
  expected_version?: number;
  payload?: Record<string, unknown>;
  idem?: string;
}

/**
 * Executes a deterministic Deal FSM transition (`m_deal_action`) with idempotency key reuse
 * and automatic `VERSION_CONFLICT` cache refresh + toast (§8.3, §9.1, §9.2).
 */
export function useDealAction(defaultDealId?: string) {
  const queryClient = useQueryClient();
  const idemRef = useRef<{ actionKey: string; key: string } | null>(null);

  return useMutation({
    mutationFn: async (input: DealActionMutationInput) => {
      const resolvedDealId = input.deal_id || defaultDealId;
      if (!resolvedDealId) {
        throw new Error('deal_id is required for useDealAction');
      }

      const cachedDeal = queryClient.getQueryData<Deal>(['deal', resolvedDealId]);
      const expectedVersion = input.expected_version ?? cachedDeal?.version ?? 1;

      const intentSig = `${resolvedDealId}:${input.action}:${expectedVersion}`;
      if (!idemRef.current || idemRef.current.actionKey !== intentSig) {
        idemRef.current = { actionKey: intentSig, key: input.idem || newIdemKey() };
      }

      const updated = await mudraApi.dealAction({
        deal_id: resolvedDealId,
        action: input.action,
        expected_version: expectedVersion,
        payload: input.payload ?? {},
        idem: idemRef.current.key,
      });

      idemRef.current = null;
      return updated;
    },
    onSuccess: (updatedDeal) => {
      queryClient.setQueryData(['deal', updatedDeal.id], updatedDeal);
      queryClient.invalidateQueries({ queryKey: ['messages', updatedDeal.id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      if (updatedDeal.listing?.id) {
        queryClient.invalidateQueries({ queryKey: ['listing', updatedDeal.listing.id] });
      }
    },
    onError: (err, variables) => {
      const resolvedDealId = variables.deal_id || defaultDealId;
      if (isMudraError(err, 'VERSION_CONFLICT')) {
        idemRef.current = null;
        showToast(i18n.t('deals.updated_try_again'), 'danger');
        if (resolvedDealId) {
          queryClient.invalidateQueries({ queryKey: ['deal', resolvedDealId] });
          queryClient.invalidateQueries({ queryKey: ['messages', resolvedDealId] });
        }
      }
    },
  });
}

export function useResolveIfDue(defaultDealId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (arg?: string | { deal_id?: string }) => {
      const resolvedDealId =
        typeof arg === 'string' ? arg : arg?.deal_id || defaultDealId;
      if (!resolvedDealId) throw new Error('deal_id is required');
      return mudraApi.resolveIfDue(resolvedDealId);
    },
    onSuccess: (deal) => {
      if (deal?.id) {
        queryClient.setQueryData(['deal', deal.id], deal);
        queryClient.invalidateQueries({ queryKey: ['messages', deal.id] });
        queryClient.invalidateQueries({ queryKey: ['deals'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        queryClient.invalidateQueries({ queryKey: ['me'] });
      }
    },
  });
}

export function useDemoTick(defaultDealId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dealId?: string) => {
      const id = dealId || defaultDealId;
      if (!id) throw new Error('deal_id is required');
      return mudraApi.demoTick(id);
    },
    onSuccess: (deal) => {
      if (deal?.id) {
        queryClient.setQueryData(['deal', deal.id], deal);
        queryClient.invalidateQueries({ queryKey: ['messages', deal.id] });
      }
    },
  });
}

export * from '@/features/chat/hooks';

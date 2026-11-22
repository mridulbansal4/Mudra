import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { newIdemKey } from '@/lib/idem';
import { useSessionStore } from '@/state/session';
import { mudraApi } from '@/features/api';
import type { LocaleCode, Message } from '@/types';

export function useMessages(
  dealId?: string | null,
  options?: { enabled?: boolean; pollIntervalMs?: number }
) {
  const token = useSessionStore((s) => s.token);
  const enabled = (options?.enabled ?? true) && Boolean(token && dealId);

  return useQuery<Message[]>({
    queryKey: ['messages', dealId],
    queryFn: () => mudraApi.messages(dealId as string, 0),
    enabled,
    staleTime: 2_500,
    refetchInterval: options?.pollIntervalMs ?? 4_000,
    refetchIntervalInBackground: false,
  });
}

export interface SendMessageInput {
  deal_id?: string;
  body: string;
  quick_key?: string | null;
}

export function useSendMessage(defaultDealId?: string) {
  const queryClient = useQueryClient();
  const me = useSessionStore((s) => s.me);
  const locale = useSessionStore((s) => s.locale);

  return useMutation({
    mutationFn: async (input: SendMessageInput) => {
      const resolvedDealId = input.deal_id || defaultDealId;
      if (!resolvedDealId) throw new Error('deal_id is required');
      const clientId = newIdemKey();
      return mudraApi.sendMessage({
        deal_id: resolvedDealId,
        body: input.body,
        quick_key: input.quick_key ?? null,
        client_id: clientId,
      });
    },
    onMutate: async (input) => {
      const resolvedDealId = input.deal_id || defaultDealId;
      if (!resolvedDealId) return {};

      await queryClient.cancelQueries({ queryKey: ['messages', resolvedDealId] });
      const previous = queryClient.getQueryData<Message[]>(['messages', resolvedDealId]) ?? [];

      const optimisticMsg: Message = {
        id: `temp-${Date.now()}`,
        deal_id: resolvedDealId,
        sender_id: me?.id ?? null,
        kind: input.quick_key ? 'quick' : 'text',
        body: input.body,
        quick_key: input.quick_key ?? null,
        lang: locale,
        translations: {},
        created_at: new Date().toISOString(),
        optimistic: true,
      };

      queryClient.setQueryData<Message[]>(
        ['messages', resolvedDealId],
        [...previous, optimisticMsg]
      );

      return { previous, resolvedDealId };
    },
    onError: (_err, _input, context) => {
      if (context?.resolvedDealId && context.previous) {
        queryClient.setQueryData(['messages', context.resolvedDealId], context.previous);
      }
    },
    onSettled: (_data, _err, input) => {
      const resolvedDealId = input.deal_id || defaultDealId;
      if (resolvedDealId) {
        queryClient.invalidateQueries({ queryKey: ['messages', resolvedDealId] });
        queryClient.invalidateQueries({ queryKey: ['deal', resolvedDealId] });
      }
    },
  });
}

export function useTranslateMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      messageId: number | string;
      targetLocale: LocaleCode;
      dealId?: string;
    }) => {
      const res = await mudraApi.translateMessage(params.messageId, params.targetLocale);
      return { ...params, text: res?.text ?? null };
    },
    onSuccess: ({ dealId, messageId, targetLocale, text }) => {
      if (!dealId || !text) return;
      queryClient.setQueryData<Message[]>(['messages', dealId], (old) => {
        if (!old) return old;
        return old.map((m) =>
          String(m.id) === String(messageId)
            ? {
                ...m,
                translations: { ...(m.translations || {}), [targetLocale]: text },
              }
            : m
        );
      });
    },
  });
}

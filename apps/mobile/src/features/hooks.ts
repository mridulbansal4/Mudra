import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSessionStore } from '@/state/session';
import {
  mudraApi,
  type CreateListingPayload,
  type ProfilePatch,
  type ReportTarget,
  type SignupParams,
} from '@/features/api';
import type {
  FeedFilters,
  ListingCardData,
  ListingDetail,
  ListingStatus,
  Me,
  SellerProfile,
  WalletData,
} from '@/types';

export function usePing() {
  return useQuery({
    queryKey: ['ping'],
    queryFn: () => mudraApi.ping(),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useMe(options?: { enabled?: boolean }) {
  const token = useSessionStore((s) => s.token);
  const updateMe = useSessionStore((s) => s.updateMe);
  const enabled = (options?.enabled ?? true) && Boolean(token);

  return useQuery<Me>({
    queryKey: ['me', token],
    queryFn: async () => {
      const me = await mudraApi.me();
      await updateMe(me);
      return me;
    },
    enabled,
    staleTime: 10_000,
    refetchInterval: 15_000,
    refetchIntervalInBackground: false,
  });
}

export function useSignup() {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: SignupParams) => mudraApi.signup(params),
    onSuccess: async (res) => {
      await setSession(res.token, res.me);
      queryClient.setQueryData(['me', res.token], res.me);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useLogin() {
  const setSession = useSessionStore((s) => s.setSession);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: { phone: string; pin: string }) =>
      mudraApi.login(params.phone, params.pin),
    onSuccess: async (res) => {
      await setSession(res.token, res.me);
      queryClient.setQueryData(['me', res.token], res.me);
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useLogout() {
  const logoutStore = useSessionStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await mudraApi.logout();
      } catch {
        // always clear local session
      }
      await logoutStore();
    },
    onSuccess: () => queryClient.clear(),
  });
}

export function useUpdateProfile() {
  const updateMe = useSessionStore((s) => s.updateMe);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: ProfilePatch) => mudraApi.updateProfile(patch),
    onSuccess: async (me) => {
      await updateMe(me);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });
}

export function useChangePin() {
  return useMutation({
    mutationFn: (params: { oldPin: string; newPin: string }) =>
      mudraApi.changePin(params.oldPin, params.newPin),
  });
}

export function useDeleteAccount() {
  const logoutStore = useSessionStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (pin: string) => mudraApi.deleteAccount(pin),
    onSuccess: async () => {
      await logoutStore();
      queryClient.clear();
    },
  });
}

export function useFeed(filters: FeedFilters = {}, limit = 20, offset = 0) {
  const token = useSessionStore((s) => s.token);
  return useQuery<ListingCardData[]>({
    queryKey: ['feed', filters, limit, offset, token],
    queryFn: () => mudraApi.feed(filters, limit, offset),
    staleTime: 10_000,
  });
}

export function useInfiniteFeed(filters: FeedFilters = {}, pageSize = 20) {
  const token = useSessionStore((s) => s.token);
  return useInfiniteQuery<ListingCardData[]>({
    queryKey: ['feed', 'infinite', filters, pageSize, token],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      mudraApi.feed(filters, pageSize, typeof pageParam === 'number' ? pageParam : 0),
    getNextPageParam: (lastPage, allPages) =>
      !lastPage || lastPage.length < pageSize
        ? undefined
        : allPages.reduce((acc, p) => acc + p.length, 0),
    staleTime: 10_000,
  });
}

export function useListing(listingId?: string | null) {
  const token = useSessionStore((s) => s.token);
  return useQuery<ListingDetail>({
    queryKey: ['listing', listingId, token],
    queryFn: () => mudraApi.listing(listingId as string),
    enabled: Boolean(listingId),
    staleTime: 8_000,
  });
}

export function useMyListings() {
  const token = useSessionStore((s) => s.token);
  return useQuery<ListingCardData[]>({
    queryKey: ['myListings', token],
    queryFn: () => mudraApi.myListings(),
    enabled: Boolean(token),
    staleTime: 8_000,
  });
}

export function useSavedListings() {
  const token = useSessionStore((s) => s.token);
  return useQuery<ListingCardData[]>({
    queryKey: ['savedListings', token],
    queryFn: () => mudraApi.savedListings(),
    enabled: Boolean(token),
    staleTime: 8_000,
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (listingId: string) => mudraApi.toggleSave(listingId),
    onSuccess: (_res, listingId) => {
      queryClient.invalidateQueries({ queryKey: ['listing', listingId] });
      queryClient.invalidateQueries({ queryKey: ['savedListings'] });
    },
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  const clearDraft = useSessionStore((s) => s.clearDraft);
  return useMutation({
    mutationFn: (data: CreateListingPayload) => mudraApi.createListing(data),
    onSuccess: async (listing) => {
      await clearDraft();
      queryClient.setQueryData(['listing', listing.id], listing);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { listingId: string; patch: Partial<CreateListingPayload> }) =>
      mudraApi.updateListing(params.listingId, params.patch),
    onSuccess: (listing) => {
      queryClient.setQueryData(['listing', listing.id], listing);
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
    },
  });
}

export function useSetListingStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      listingId: string;
      status: Extract<ListingStatus, 'active' | 'removed' | 'sold'>;
    }) => mudraApi.setListingStatus(params.listingId, params.status),
    onSuccess: (_res, params) => {
      queryClient.invalidateQueries({ queryKey: ['listing', params.listingId] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useSellerProfile(profileId?: string | null) {
  const token = useSessionStore((s) => s.token);
  return useQuery<SellerProfile>({
    queryKey: ['sellerProfile', profileId, token],
    queryFn: () => mudraApi.sellerProfile(profileId as string),
    enabled: Boolean(profileId),
    staleTime: 10_000,
  });
}

export function useWallet(options?: { enabled?: boolean }) {
  const token = useSessionStore((s) => s.token);
  const enabled = (options?.enabled ?? true) && Boolean(token);
  return useQuery<WalletData>({
    queryKey: ['wallet', token],
    queryFn: () => mudraApi.wallet(),
    enabled,
    staleTime: 8_000,
  });
}

export function useTopupDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mudraApi.topupDemo(),
    onSuccess: (wallet) => {
      queryClient.setQueryData(['wallet'], wallet);
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useReport() {
  return useMutation({
    mutationFn: (params: { target: ReportTarget; reason: string; note?: string | null }) =>
      mudraApi.report(params.target, params.reason, params.note),
  });
}

export function useResetDemo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => mudraApi.resetDemo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deal'] });
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      queryClient.invalidateQueries({ queryKey: ['myListings'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export * from './deals/hooks';
export * from './deals/nextStep';
export * from './api';

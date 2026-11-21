import { rpc } from '@/lib/rpc';
import { newIdemKey } from '@/lib/idem';
import type {
  CurrencyCode,
  Deal,
  DealAction,
  DealSummary,
  FeedFilters,
  ListingCardData,
  ListingCategory,
  ListingCondition,
  ListingDetail,
  ListingKind,
  ListingStatus,
  LocaleCode,
  Me,
  Message,
  PrimaryRole,
  SellerProfile,
  WalletData,
} from '@/types';

export interface SignupParams {
  name: string;
  phone: string;
  pin: string;
  role?: PrimaryRole;
  locale?: LocaleCode;
  currency?: CurrencyCode;
  campus?: string | null;
}

export interface AuthResponse {
  token: string;
  me: Me;
}

export interface ProfilePatch {
  name?: string;
  campus?: string | null;
  bio?: string | null;
  locale?: LocaleCode;
  currency?: CurrencyCode;
  primary_role?: PrimaryRole;
}

export interface CreateListingPayload {
  title: string;
  description?: string;
  category: ListingCategory;
  condition: ListingCondition;
  kind: ListingKind;
  price_minor?: number;
  photos: string[];
  meetup_spot?: string | null;
  campus?: string | null;
}

export interface StartDealParams {
  listing_id: string;
  amount_minor?: number | null;
  swap_offer?: string | null;
  note?: string | null;
  idem?: string;
}

export interface DealActionParams {
  deal_id: string;
  action: DealAction;
  expected_version: number;
  payload?: Record<string, unknown>;
  idem?: string;
}

export interface SendMessageParams {
  deal_id: string;
  body: string;
  quick_key?: string | null;
  client_id?: string | null;
}

export interface ReportTarget {
  listing_id?: string;
  deal_id?: string;
  profile_id?: string;
}

/**
 * Typed imperative API wrappers for all 28+ `public.m_*` Postgres RPCs (§8.8).
 */
export const mudraApi = {
  ping: () => rpc<{ ok: boolean; server_now: string }>('m_ping'),

  signup: (params: SignupParams) =>
    rpc<AuthResponse>(
      'm_signup',
      {
        p_name: params.name,
        p_phone: params.phone,
        p_pin: params.pin,
        p_role: params.role ?? 'both',
        p_locale: params.locale ?? 'en',
        p_currency: params.currency ?? 'INR',
        p_campus: params.campus ?? null,
      },
      { withToken: false }
    ),

  login: (phone: string, pin: string) =>
    rpc<AuthResponse>('m_login', { p_phone: phone, p_pin: pin }, { withToken: false }),

  logout: () => rpc<{ ok: boolean }>('m_logout'),

  me: () => rpc<Me>('m_me'),

  updateProfile: (patch: ProfilePatch) =>
    rpc<Me>('m_update_profile', { p_patch: patch }),

  changePin: (oldPin: string, newPin: string) =>
    rpc<{ ok: boolean }>('m_change_pin', { p_old: oldPin, p_new: newPin }),

  deleteAccount: (pin: string) =>
    rpc<{ ok: boolean }>('m_delete_account', { p_pin: pin }),

  feed: (filters: FeedFilters = {}, limit = 20, offset = 0) =>
    rpc<ListingCardData[]>('m_feed', {
      p_filters: filters,
      p_limit: limit,
      p_offset: offset,
    }),

  listing: (listingId: string) =>
    rpc<ListingDetail>('m_listing', { p_listing_id: listingId }),

  createListing: (data: CreateListingPayload) =>
    rpc<ListingDetail>('m_create_listing', { p_data: data }),

  updateListing: (listingId: string, patch: Partial<CreateListingPayload>) =>
    rpc<ListingDetail>('m_update_listing', {
      p_listing_id: listingId,
      p_patch: patch,
    }),

  setListingStatus: (listingId: string, status: Extract<ListingStatus, 'active' | 'removed' | 'sold'>) =>
    rpc<ListingDetail>('m_set_listing_status', {
      p_listing_id: listingId,
      p_status: status,
    }),

  myListings: () => rpc<ListingCardData[]>('m_my_listings'),

  toggleSave: (listingId: string) =>
    rpc<{ saved: boolean } | boolean>('m_toggle_save', { p_listing_id: listingId }),

  savedListings: () => rpc<ListingCardData[]>('m_saved'),

  sellerProfile: (profileId: string) =>
    rpc<SellerProfile>('m_seller_profile', { p_profile_id: profileId }),

  startDeal: (params: StartDealParams) =>
    rpc<Deal>('m_start_deal', {
      p_listing_id: params.listing_id,
      p_amount_minor: params.amount_minor ?? null,
      p_swap_offer: params.swap_offer ?? null,
      p_note: params.note ?? null,
      p_idem: params.idem ?? newIdemKey(),
    }),

  dealAction: (params: DealActionParams) =>
    rpc<Deal>('m_deal_action', {
      p_deal_id: params.deal_id,
      p_action: params.action,
      p_expected_version: params.expected_version,
      p_payload: params.payload ?? {},
      p_idem: params.idem ?? newIdemKey(),
    }),

  deals: (role: 'buyer' | 'seller' | 'all' = 'all') =>
    rpc<DealSummary[]>('m_deals', { p_role: role }),

  deal: (dealId: string) => rpc<Deal>('m_deal', { p_deal_id: dealId }),

  messages: (dealId: string, afterId = 0) =>
    rpc<Message[]>('m_messages', { p_deal_id: dealId, p_after_id: afterId }),

  sendMessage: (params: SendMessageParams) =>
    rpc<Message>('m_send_message', {
      p_deal_id: params.deal_id,
      p_body: params.body,
      p_quick_key: params.quick_key ?? null,
      p_client_id: params.client_id ?? newIdemKey(),
    }),

  translateMessage: (messageId: number | string, targetLocale: LocaleCode) =>
    rpc<{ text: string | null } | null>('m_translate_message', {
      p_message_id: Number(messageId),
      p_target: targetLocale,
    }),

  resolveIfDue: (dealId: string) =>
    rpc<Deal>('m_resolve_if_due', { p_deal_id: dealId }),

  demoTick: (dealId: string) => rpc<Deal>('m_demo_tick', { p_deal_id: dealId }),

  wallet: () => rpc<WalletData>('m_wallet'),

  topupDemo: () => rpc<WalletData>('m_topup_demo'),

  report: (target: ReportTarget, reason: string, note?: string | null) =>
    rpc<{ ok: boolean }>('m_report', {
      p_target: target,
      p_reason: reason,
      p_note: note ?? null,
    }),

  resetDemo: () => rpc<{ ok: boolean }>('m_reset_demo'),
};

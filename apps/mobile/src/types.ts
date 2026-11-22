export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'SGD' | 'AED' | 'CAD' | 'AUD';
export type LocaleCode = 'en' | 'hi' | 'ta' | 'mr' | 'es';
export type RoleMode = 'buy' | 'sell';
export type PrimaryRole = 'buy' | 'sell' | 'both';

export type ListingCategory =
  | 'books' | 'electronics' | 'phones' | 'home' | 'rides'
  | 'fashion' | 'sports' | 'hobbies' | 'tickets' | 'other';

export type ListingCondition = 'new' | 'like_new' | 'good' | 'fair';
export type ListingKind = 'sell' | 'swap' | 'free';
export type ListingStatus = 'active' | 'reserved' | 'sold' | 'removed';

export type DealState =
  | 'OFFERED' | 'CREATED' | 'FUNDED' | 'INSPECTION_LIVE'
  | 'ASSAY_VERIFIED' | 'RELEASED' | 'DISPUTED_FROZEN'
  | 'ARBITRATED_SPLIT' | 'REFUNDED' | 'DECLINED' | 'CANCELLED';

export type DealAction =
  | 'ACCEPT' | 'COUNTER' | 'DECLINE' | 'CANCEL' | 'LOCK_ESCROW'
  | 'START_ASSAY' | 'CHOOSE_IN_PERSON' | 'CONFIRM_IN_PERSON'
  | 'RAISE_DISPUTE' | 'CHECK_ITEM' | 'MARK_ASSAY_VERIFIED'
  | 'RELEASE_FUNDS' | 'ADD_STATEMENT' | 'LEAVE_REVIEW';

export type InspectionMode = 'live' | 'in_person';

export type MessageKind =
  | 'text' | 'quick' | 'offer' | 'system'
  | 'escrow' | 'receipt' | 'verdict' | 'evidence';

export type WalletTxKind =
  | 'signup_bonus' | 'topup' | 'escrow_lock'
  | 'escrow_release' | 'refund' | 'split' | 'reset';

export type QuickReplyKey =
  | 'still_available' | 'lowest_price' | 'where_meet'
  | 'show_live' | 'deal' | 'locked'
  | 'going_live' | 'thanks' | 'on_my_way';

export interface WalletBalance {
  currency: CurrencyCode;
  balance_minor: number;
  topups_today?: number;
  topup_day?: string | null;
}

export interface WalletTx {
  id: number;
  profile_id?: string;
  currency: CurrencyCode;
  amount_minor: number;
  kind: WalletTxKind | string;
  deal_id?: string | null;
  note?: string | null;
  created_at: string;
}

export interface WalletData {
  balances: WalletBalance[];
  balance_minor?: number;
  currency?: CurrencyCode;
  tx?: WalletTx[];
  transactions?: WalletTx[];
  topups_today?: number;
  server_now?: string;
}

export interface MeCounts {
  active_listings: number;
  needs_you: number;
  unread: number;
  offers_waiting?: number;
  earned_minor?: number;
}

export interface Me {
  id: string;
  name: string;
  phone_e164: string;
  primary_role: PrimaryRole;
  locale: LocaleCode;
  currency: CurrencyCode;
  campus?: string | null;
  bio?: string | null;
  avatar_hue: number;
  rating_sum?: number;
  rating_count?: number;
  rating?: number | null;
  deals_done: number;
  is_demo_bot?: boolean;
  is_demo_account?: boolean;
  created_at?: string;
  wallets?: WalletBalance[];
  wallet_balance_minor?: number;
  balance_minor?: number;
  counts?: MeCounts;
  active_listings?: number;
  needs_you?: number;
  unread?: number;
  offers_waiting?: number;
  earned_minor?: number;
  server_now?: string;
}

export interface SellerCard {
  id: string;
  name: string;
  avatar_hue: number;
  rating: number | null;
  rating_count?: number;
  deals_done?: number;
  campus?: string | null;
  bio?: string | null;
  is_demo_bot?: boolean;
  phone?: string | null;
  created_at?: string;
}

export interface ListingCardData {
  id: string;
  seller_id?: string;
  title: string;
  description?: string;
  price_minor: number;
  currency: CurrencyCode;
  kind: ListingKind;
  condition: ListingCondition;
  category: ListingCategory;
  photo: string;
  photos?: string[];
  campus?: string | null;
  meetup_spot?: string | null;
  status: ListingStatus;
  offer_count?: number;
  offers_count?: number;
  created_at: string;
  updated_at?: string;
  seller?: SellerCard;
}

export interface ListingDetail {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  category: ListingCategory;
  condition: ListingCondition;
  kind: ListingKind;
  price_minor: number;
  currency: CurrencyCode;
  photos: string[];
  photo?: string;
  meetup_spot?: string | null;
  campus?: string | null;
  status: ListingStatus;
  created_at: string;
  updated_at?: string;
  seller: SellerCard;
  saved_by_me?: boolean;
  my_open_deal_id?: string | null;
  offer_count?: number;
  server_now?: string;
}

export type Listing = ListingDetail;

export interface ChecklistItem {
  index?: number;
  label: string;
  photo_url?: string | null;
  at?: string | null;
}

export interface Verdict {
  seller_pct: number;
  buyer_pct: number;
  seller_minor: number;
  buyer_minor: number;
  reason: string;
}

export interface NextStepInfo {
  text_key?: string;
  action?: string | null;
  sentence?: string;
  buttonLabel?: string;
  actionType?: string;
}

export interface DealListingSummary {
  id: string;
  title: string;
  photo: string;
  photos?: string[];
  category: ListingCategory;
  status: ListingStatus;
  kind?: ListingKind;
  price_minor?: number;
  currency?: CurrencyCode;
  meetup_spot?: string | null;
  campus?: string | null;
}

export interface DealCounterpart {
  id: string;
  name: string;
  avatar_hue: number;
  rating: number | null;
  deals_done: number;
  is_demo_bot: boolean;
  phone?: string | null;
  campus?: string | null;
}

export interface Deal {
  id: string;
  short_code: string;
  state: DealState;
  version: number;
  kind: ListingKind;
  amount_minor: number;
  currency: CurrencyCode;
  swap_offer?: string | null;
  my_role: 'buyer' | 'seller';
  buyer_id?: string;
  seller_id?: string;
  listing_id?: string;
  listing: DealListingSummary;
  counterpart: DealCounterpart;
  offer_by?: string;
  offer_by_me: boolean;
  inspection_mode?: InspectionMode | null;
  checklist: ChecklistItem[];
  escrow_locked_minor: number;
  verified_before_freeze?: boolean;
  frozen_from_state?: DealState | null;
  frozen_at?: string | null;
  freeze_ends_at?: string | null;
  frozen_by?: string | null;
  buyer_statement?: string | null;
  seller_statement?: string | null;
  verdict?: Verdict | null;
  unread: number;
  reviewed_by_me: boolean;
  buyer_reviewed?: boolean;
  seller_reviewed?: boolean;
  story_stage: 1 | 2 | 3 | 4;
  allowed_actions: DealAction[];
  next_step?: NextStepInfo | null;
  voucher_hash?: string | null;
  last_voucher_hash?: string | null;
  needs_you?: boolean;
  server_now?: string;
  created_at: string;
  updated_at: string;
}

export type DealSummary = Deal;

export interface Message {
  id: number | string;
  deal_id: string;
  sender_id: string | null;
  kind: MessageKind;
  body: string;
  quick_key?: QuickReplyKey | string | null;
  payload?: Record<string, unknown>;
  lang: LocaleCode | string;
  translations?: Record<string, string>;
  created_at: string;
  client_id?: string;
  optimistic?: boolean;
}

export interface Review {
  id: number;
  deal_id: string;
  author_id: string;
  author_name?: string;
  author_avatar_hue?: number;
  subject_id: string;
  stars: number;
  body?: string | null;
  tags: string[];
  created_at: string;
}

export interface SellerProfile {
  id?: string;
  name?: string;
  avatar_hue?: number;
  rating?: number | null;
  rating_count?: number;
  deals_done?: number;
  campus?: string | null;
  bio?: string | null;
  created_at?: string;
  profile?: SellerCard & {
    bio?: string | null;
    campus?: string | null;
    created_at: string;
    deals_done: number;
    rating_count?: number;
  };
  listings: ListingCardData[];
  reviews: Review[];
}

export interface FeedFilters {
  q?: string;
  category?: ListingCategory | 'all' | null;
  kind?: ListingKind | 'all' | null;
  condition?: ListingCondition | 'all' | null;
  min?: number | null;
  max?: number | null;
  campus_only?: boolean;
  sort?: 'newest' | 'price_low' | 'price_high' | 'price_asc' | 'price_desc';
  exclude_mine?: boolean;
}

export interface DraftListing {
  title?: string;
  description?: string;
  category?: ListingCategory;
  condition?: ListingCondition;
  kind?: ListingKind;
  priceInput?: string;
  photos?: string[];
  meetup_spot?: string;
  campus?: string;
}

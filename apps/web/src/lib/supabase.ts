import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Row shape delivered by Supabase Realtime for `system_audit_vouchers` inserts. */
export interface VoucherRow {
  id?: string;
  external_id?: string;
  deal_room_id?: string;
  voucher_type?: string;
  curr_voucher_sha256?: string;
  payload_json?: Record<string, unknown>;
}

export interface PostgresChangeFilter {
  event: "INSERT" | "UPDATE" | "*";
  schema: "public";
  table: "system_audit_vouchers" | "escrow_contracts" | "deal_rooms";
  filter?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDealRoomUUID(id: string): boolean {
  return UUID_RE.test(id.trim());
}

/** Returns null when either public env var is missing so offline demos keep working. */
export function createSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  const supabaseUrl = (url ?? "").trim();
  const key = (anonKey ?? "").trim();
  if (!supabaseUrl || !key) return null;
  return createClient(supabaseUrl, key);
}

export const supabase = createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

/** Server filter for voucher inserts. External deal ids are not UUID columns, so they stay unfiltered. */
export function voucherChangeFilter(dealRoomId: string): PostgresChangeFilter {
  const filter: PostgresChangeFilter = {
    event: "INSERT",
    schema: "public",
    table: "system_audit_vouchers",
  };
  if (isDealRoomUUID(dealRoomId)) filter.filter = `deal_room_id=eq.${dealRoomId.trim()}`;
  return filter;
}

/** Server filters for deal room, escrow, and voucher changes that should refresh one deal. */
export function dealRealtimeFilters(dealId: string): PostgresChangeFilter[] {
  const id = dealId.trim();
  const uuid = isDealRoomUUID(id);
  return [
    voucherChangeFilter(id),
    {
      event: "UPDATE",
      schema: "public",
      table: "escrow_contracts",
      ...(uuid ? { filter: `deal_room_id=eq.${id}` } : {}),
    },
    {
      event: "*",
      schema: "public",
      table: "deal_rooms",
      filter: uuid ? `id=eq.${id}` : `external_id=eq.${id}`,
    },
  ];
}

function unsubscribe(client: SupabaseClient, channel: ReturnType<SupabaseClient["channel"]>) {
  return () => {
    void client.removeChannel(channel);
  };
}

/**
 * Subscribe to live voucher inserts for a deal room.
 * `dealRoomId` may be the Postgres UUID or the external id (`d_8821_juki`).
 * Returns a no-op unsubscribe when the client is not configured.
 */
export function subscribeToVouchers(
  dealRoomId: string,
  onVoucher: (voucher: VoucherRow) => void,
  client: SupabaseClient | null = supabase,
): () => void {
  if (!client || !dealRoomId.trim()) return () => {};
  const channel = client
    .channel(`vouchers:${dealRoomId}`)
    .on("postgres_changes", voucherChangeFilter(dealRoomId), (payload) => {
      onVoucher((payload.new ?? {}) as VoucherRow);
    })
    .subscribe();
  return unsubscribe(client, channel);
}

/**
 * Subscribe to voucher inserts, escrow updates, and deal-room changes.
 * SSE and polling stay in place; callers should treat this as an extra refresh signal.
 */
export function subscribeToDealRealtime(
  dealId: string,
  onChange: () => void,
  client: SupabaseClient | null = supabase,
): () => void {
  if (!client || !dealId.trim()) return () => {};
  let channel = client.channel(`deal:${dealId}`);
  for (const filter of dealRealtimeFilters(dealId)) {
    channel = channel.on("postgres_changes", filter, () => onChange());
  }
  channel.subscribe();
  return unsubscribe(client, channel);
}

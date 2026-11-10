import { describe, expect, it } from "vitest";
import {
  createSupabaseClient,
  dealRealtimeFilters,
  isDealRoomUUID,
  subscribeToDealRealtime,
  subscribeToVouchers,
  voucherChangeFilter,
} from "./supabase";

describe("supabase realtime helpers", () => {
  it("stays null when public env is missing", () => {
    expect(createSupabaseClient("", "")).toBeNull();
    expect(createSupabaseClient("https://example.supabase.co", "")).toBeNull();
    expect(createSupabaseClient("", "anon")).toBeNull();
  });

  it("builds a client only when both values are present", () => {
    const client = createSupabaseClient("https://example.supabase.co", "anon-key");
    expect(client).not.toBeNull();
  });

  it("filters voucher inserts by deal_room_id only for UUIDs", () => {
    expect(isDealRoomUUID("d_8821_juki")).toBe(false);
    const external = voucherChangeFilter("d_8821_juki");
    expect(external.table).toBe("system_audit_vouchers");
    expect(external.filter).toBeUndefined();

    const id = "11111111-1111-4111-8111-111111111111";
    expect(isDealRoomUUID(id)).toBe(true);
    expect(voucherChangeFilter(id).filter).toBe(`deal_room_id=eq.${id}`);
  });

  it("watches deal_rooms by external_id for demo deal ids", () => {
    const filters = dealRealtimeFilters("d_8821_juki");
    expect(filters.map((f) => f.table)).toEqual(["system_audit_vouchers", "escrow_contracts", "deal_rooms"]);
    expect(filters[2]?.filter).toBe("external_id=eq.d_8821_juki");
  });

  it("returns a no-op unsubscribe when realtime is not configured", () => {
    const stopVoucher = subscribeToVouchers("d_8821_juki", () => {}, null);
    const stopDeal = subscribeToDealRealtime("d_8821_juki", () => {}, null);
    expect(stopVoucher()).toBeUndefined();
    expect(stopDeal()).toBeUndefined();
    expect(subscribeToVouchers("  ", () => {}, null)()).toBeUndefined();
  });
});

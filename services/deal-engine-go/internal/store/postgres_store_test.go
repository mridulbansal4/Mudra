package store_test

import (
	"context"
	"encoding/hex"
	"errors"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/clients"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/config"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/fsm"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

func TestDeterministicUUIDAndHelpers(t *testing.T) {
	u1 := store.DealUUID("d_8821_juki")
	u2 := store.DealUUID("d_8821_juki")
	if u1 != u2 || len(u1) != 36 {
		t.Fatalf("expected deterministic 36-char UUIDv5, got %q vs %q", u1, u2)
	}
	if store.DealUUID("d_8821_juki") == store.EscrowUUID("d_8821_juki") {
		t.Fatal("deal and escrow namespaces must produce distinct UUIDs")
	}

	origUserID := "e01_11111111-1111-4111-8111-111111111101"
	dbUUID := store.UserUUID(origUserID)
	if dbUUID != "11111111-1111-4111-8111-111111111101" {
		t.Fatalf("unexpected UserUUID %q", dbUUID)
	}
	if got := store.FormatUserID(dbUUID); got != origUserID {
		t.Fatalf("FormatUserID roundtrip mismatch: %q != %q", got, origUserID)
	}
}

func TestPostgresStoreLiveSupabaseSuite(t *testing.T) {
	_ = config.Load() // loads repo-root .env if present
	dsn := strings.TrimSpace(config.LoadDatabaseURL())
	if dsn == "" || config.IsPlaceholderDatabaseURL(dsn) {
		t.Skip("DATABASE_URL unset or placeholder; skipping live Supabase integration test")
	}

	testSchema := "samadhan_test_" + store.RandHex(4)
	ctx := context.Background()

	ps, err := store.NewPostgresStore(ctx, store.PostgresOptions{
		DatabaseURL: dsn,
		MaxConns:    6,
		MinConns:    2,
		Schema:      testSchema,
	})
	if err != nil {
		t.Skipf("DATABASE_URL unreachable in test environment (%v); skipping live test", err)
	}
	t.Cleanup(func() {
		cctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_, _ = ps.Pool().Exec(cctx, "DROP SCHEMA IF EXISTS "+testSchema+" CASCADE")
		_ = ps.Close()
	})

	if ps.BackendName() != store.BackendPostgreSQL {
		t.Fatalf("expected backend %q, got %q", store.BackendPostgreSQL, ps.BackendName())
	}

	// 1. Idempotent SeedStatic (run twice, verify zero duplicates)
	now := time.Now().UTC()
	ps.SeedStatic(now)
	ps.SeedStatic(now)
	c := ps.Counts()
	if c.Users != 5 || c.Subchannels != 2 || c.OpenChannels != 1 {
		t.Fatalf("unexpected seeded counts after double SeedStatic: %+v", c)
	}

	// 2. Create deal d_8821_juki + message + assay + ACID transition
	seedBytes, _ := hex.DecodeString(config.DevEd25519SeedHex)
	signer := clients.NewGoSigner(seedBytes)

	rajesh, _ := store.PersonaByPreset("P-01_RAJESH")
	vikram, _ := store.PersonaByPreset("P-02_VIKRAM")
	d := &store.Deal{
		ID:             store.SeedDealID,
		ChannelID:      store.SeedChannelID,
		Title:          store.SeedDealTitle,
		BuyerID:        rajesh.ID,
		SellerID:       vikram.ID,
		Machine:        fsm.NewMachine(fsm.StateCreated),
		AmountPaise:    store.SeedAmountPaise,
		Currency:       "INR",
		Checklist:      store.DefaultChecklist(),
		UPIMandateUMN:  "samadhan.8821@okaxis",
		RequiredSerial: store.SeedSerial,
		MinMotorRPM:    store.SeedMinRPM,
		ReferencePHash: store.SeedReferencePHash,
		CreatedAt:      now.Add(-10 * time.Minute),
		UpdatedAt:      now,
	}
	ps.PutDeal(d)

	mintFn := func(act fsm.Action) store.VoucherMintFunc {
		return func(prevHash string, res fsm.Result, amountPaise int64) (store.Voucher, store.ChatMessage, error) {
			if prevHash == "" {
				prevHash = clients.GenesisHash
			}
			ts := time.Now().UTC()
			vType := fsm.VoucherType(act)
			payload := map[string]any{
				"action":       string(act),
				"prev_state":   string(res.Prev),
				"fsm_state":    string(res.Next),
				"version":      res.Version,
				"amount_paise": amountPaise,
				"actor_role":   "buyer",
				"issued_at":    ts.Format(time.RFC3339Nano),
			}
			sv, err := signer.Sign(d.ID, vType, payload, prevHash)
			if err != nil {
				return store.Voucher{}, store.ChatMessage{}, err
			}
			v := store.Voucher{
				ID: "vch_" + store.RandHex(6), VoucherType: vType,
				PrevVoucherSHA256: prevHash, CurrVoucherSHA256: sv.CurrHashHex,
				Ed25519Signature: sv.SignatureHex, PublicKeyHex: sv.PublicKeyHex,
				Payload: payload, Engine: "go-test", CreatedAt: ts,
			}
			card := store.ChatMessage{
				ID: "msg_" + store.RandHex(6), DealID: d.ID, SenderRole: "system",
				SenderName: "SAMADHAN Escrow", MessageType: "x-samadhan-escrow-card",
				RawText: string(res.Prev) + " -> " + string(res.Next), TranslatedText: string(res.Prev) + " -> " + string(res.Next),
				ExtractedTerms: map[string]any{}, Extras: map[string]any{"version": res.Version},
				Engine: "go-test", CreatedAt: ts,
			}
			return v, card, nil
		}
	}

	res, v1, _, err := ps.ApplyTransition(ctx, d, fsm.ActionLockEscrow, 1, mintFn(fsm.ActionLockEscrow))
	if err != nil || res.Next != fsm.StateFunded || res.Version != 2 {
		t.Fatalf("LOCK_ESCROW failed: res=%+v err=%v", res, err)
	}

	// 3. Stale optimistic lock version MUST return *fsm.ConflictError
	_, _, _, staleErr := ps.ApplyTransition(ctx, d, fsm.ActionStartAssay, 1, mintFn(fsm.ActionStartAssay))
	var ce *fsm.ConflictError
	if !errors.As(staleErr, &ce) {
		t.Fatalf("expected *fsm.ConflictError on stale version, got %v", staleErr)
	}

	// 4. Concurrent optimistic locking race: 8 goroutines attempt START_ASSAY at expected_version=2
	var wins, conflicts atomic.Int32
	var wg sync.WaitGroup
	for i := 0; i < 8; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			_, _, _, rerr := ps.ApplyTransition(ctx, d, fsm.ActionStartAssay, 2, mintFn(fsm.ActionStartAssay))
			if rerr == nil {
				wins.Add(1)
			} else if errors.As(rerr, &ce) {
				conflicts.Add(1)
			} else {
				t.Errorf("unexpected race error: %v", rerr)
			}
		}()
	}
	wg.Wait()
	if wins.Load() != 1 || conflicts.Load() != 7 {
		t.Fatalf("expected 1 win and 7 optimistic lock conflicts, got wins=%d conflicts=%d", wins.Load(), conflicts.Load())
	}

	// 5. Append-only trigger verification on system_audit_vouchers
	_, updErr := ps.Pool().Exec(ctx, `UPDATE system_audit_vouchers SET voucher_type = 'FUNDS_RELEASED' WHERE curr_voucher_sha256 = $1`, v1.CurrVoucherSHA256)
	if updErr == nil || !strings.Contains(updErr.Error(), "system_audit_vouchers is append-only") {
		t.Fatalf("expected trg_vouchers_append_only to reject UPDATE, got: %v", updErr)
	}
	_, delErr := ps.Pool().Exec(ctx, `DELETE FROM system_audit_vouchers WHERE curr_voucher_sha256 = $1`, v1.CurrVoucherSHA256)
	if delErr == nil || !strings.Contains(delErr.Error(), "system_audit_vouchers is append-only") {
		t.Fatalf("expected trg_vouchers_append_only to reject DELETE, got: %v", delErr)
	}

	// 6. Webhook idempotency + Arena + Dispute persistence
	ps.RecordWebhook("evt_pg_1", []byte(`{"received":true}`))
	if body, seen := ps.WebhookSeen("evt_pg_1"); !seen || !strings.Contains(string(body), "true") {
		t.Fatalf("expected webhook evt_pg_1 seen, got seen=%v body=%s", seen, string(body))
	}

	// 7. Full Restart Re-Hydration & Cryptographic ChainHash Verification
	ps2, err := store.NewPostgresStore(ctx, store.PostgresOptions{
		DatabaseURL: dsn,
		MaxConns:    4,
		MinConns:    1,
		Schema:      testSchema,
	})
	if err != nil {
		t.Fatalf("second PostgresStore open failed: %v", err)
	}
	defer func() { _ = ps2.Close() }()

	reloaded, ok := ps2.GetDeal(store.SeedDealID)
	if !ok {
		t.Fatal("expected d_8821_juki to persist across restart")
	}
	st, ver := reloaded.Machine.Snapshot()
	if st != fsm.StateInspectionLive || ver != 3 {
		t.Fatalf("expected persisted state INSPECTION_LIVE v3, got %s v%d", st, ver)
	}
	if len(reloaded.Vouchers) != 2 {
		t.Fatalf("expected 2 persisted vouchers, got %d", len(reloaded.Vouchers))
	}
	prev := clients.GenesisHash
	for i, v := range reloaded.Vouchers {
		if v.PrevVoucherSHA256 != prev {
			t.Fatalf("voucher %d prev hash mismatch: %s != %s", i, v.PrevVoucherSHA256, prev)
		}
		recomputed, err := clients.ChainHash(prev, reloaded.ID, v.VoucherType, v.Payload)
		if err != nil || recomputed != v.CurrVoucherSHA256 {
			t.Fatalf("voucher %d JSONB roundtrip broke ChainHash: recomputed=%s stored=%s err=%v", i, recomputed, v.CurrVoucherSHA256, err)
		}
		if !clients.VerifyVoucher(v.PublicKeyHex, v.CurrVoucherSHA256, v.Ed25519Signature) {
			t.Fatalf("voucher %d Ed25519 signature invalid after reload", i)
		}
		prev = v.CurrVoucherSHA256
	}
}

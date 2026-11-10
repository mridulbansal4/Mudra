package handlers

import (
	"context"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/clients"
	mw "github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/store"
)

// ArenaItem is a SKU in the bargaining arena.
type ArenaItem struct {
	SKU          string `json:"item_sku"`
	Title        string `json:"title"`
	StickerPaise int64  `json:"sticker_price_paise"`
}

// ArenaItems is the SKU catalogue (sticker prices in paise).
var ArenaItems = map[string]ArenaItem{
	"THINKPAD_X1_GEN10": {"THINKPAD_X1_GEN10", "Lenovo ThinkPad X1 Carbon Gen 10 (Refurb, i7, 16GB)", 5200000},
	"MACBOOK_AIR_M2":    {"MACBOOK_AIR_M2", "Apple MacBook Air M2 (Refurb, 8GB/256GB)", 5200000},
	"RTX_3080":          {"RTX_3080", "NVIDIA GeForce RTX 3080 10GB (Used, mining-free)", 3200000},
	"JUKI_MO_6814S":     {"JUKI_MO_6814S", "Juki MO-6814S High-Speed Overlock Machine", 14500000},
}

const (
	arenaDuration   = 60 * time.Second
	floorStartFrac  = 0.92
	floorEndFrac    = 0.84
	priceRoundPaise = 50000 // ₹500
	shopkeeperBotID = "usr_chanakya_shopkeeper_bot"
)

// arenaFloor returns the hidden reservation floor (raw) at elapsed time:
// linear decay from 92% to 84% of sticker over the 60 s run.
func arenaFloor(sticker int64, elapsed time.Duration) float64 {
	f := math.Min(1, math.Max(0, elapsed.Seconds()/arenaDuration.Seconds()))
	return float64(sticker) * (floorStartFrac - (floorStartFrac-floorEndFrac)*f)
}

func roundUpPrice(p float64) int64 {
	return int64(math.Ceil(p/priceRoundPaise)) * priceRoundPaise
}

// ArenaDecision is the pure pricing outcome of a bid.
type ArenaDecision struct {
	Accepted     bool
	CounterPaise int64 // closing price if accepted, else the counter-offer
	SavingsBps   int
}

// DecideBid applies the reservation curve. A bid >= current raw floor closes at
// max(offer, floor rounded up to ₹500) (never above sticker); otherwise the
// shopkeeper counters, monotonically non-increasing and never below the floor.
func DecideBid(sticker, offered, lastCounter int64, turns int, elapsed time.Duration) ArenaDecision {
	floorRaw := arenaFloor(sticker, elapsed)
	floorRounded := roundUpPrice(floorRaw)
	var dec ArenaDecision
	if float64(offered) >= floorRaw {
		dec.Accepted = true
		dec.CounterPaise = min(max(offered, floorRounded), sticker)
	} else {
		target := floorRaw + (float64(sticker)-floorRaw)*math.Pow(0.6, float64(turns+1))
		c := roundUpPrice(target)
		if lastCounter > 0 {
			c = min(c, lastCounter)
		}
		dec.CounterPaise = min(max(c, floorRounded), sticker)
	}
	dec.SavingsBps = int((sticker - dec.CounterPaise) * 10000 / sticker)
	return dec
}

// API-15 POST /api/v1/arena/start (public)
func (s *Server) handleArenaStart(w http.ResponseWriter, r *http.Request) {
	var req struct {
		ChallengerName  string `json:"challenger_name"`
		PreferredLocale string `json:"preferred_locale"`
		ItemSKU         string `json:"item_sku"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	req.ChallengerName = strings.TrimSpace(req.ChallengerName)
	if req.ChallengerName == "" || len(req.ChallengerName) > 60 {
		badRequest(w, r, "challenger_name required (max 60 chars)")
		return
	}
	if req.ItemSKU == "" {
		req.ItemSKU = "THINKPAD_X1_GEN10"
	}
	item, ok := ArenaItems[req.ItemSKU]
	if !ok {
		skus := make([]string, 0, len(ArenaItems))
		for k := range ArenaItems {
			skus = append(skus, k)
		}
		sort.Strings(skus)
		badRequest(w, r, "unknown item_sku; valid: "+strings.Join(skus, ", "))
		return
	}
	if req.PreferredLocale == "" {
		req.PreferredLocale = "en-IN"
	}
	now := time.Now().UTC()
	tag := store.RandHex(2)
	u := &store.User{ID: "e01_" + store.NewUUID(), NexconnUserID: "arena_" + slugify(req.ChallengerName) + "_" + tag,
		DisplayName: req.ChallengerName, Role: "guest", Locale: req.PreferredLocale, KYCTier: "GUEST_SANDBOX", CreatedAt: now}
	s.Store.PutUser(u)
	tok := s.Bridge.IssueToken(r.Context(), u.NexconnUserID, u.DisplayName, "")
	s.Store.Telemetry().RecordToken(u.NexconnUserID, tok.Mode)
	runID := "arena_run_" + tag + store.RandHex(1)
	opening := "Namaste " + req.ChallengerName + "! " + item.Title + " — sticker price ₹" + clients.FormatINR(item.StickerPaise) + ". You have 60 seconds. Make me an offer!"
	run := &store.ArenaRun{
		ID: runID, UserID: u.ID, ChallengerName: u.DisplayName, ChallengerNexconn: u.NexconnUserID, Locale: req.PreferredLocale,
		DirectChannelID: "dir_arena_" + strings.TrimPrefix(runID, "arena_run_"), ItemSKU: item.SKU, ItemTitle: item.Title,
		StickerPaise: item.StickerPaise, LastCounterPaise: item.StickerPaise, StartedAt: now, EndsAt: now.Add(arenaDuration),
		OpeningText: opening, TokenEngine: tok.Engine,
	}
	s.Store.PutArena(run)
	async("arena-opening", func(ctx context.Context) {
		s.Bridge.StreamDirect(ctx, shopkeeperBotID, u.NexconnUserID, "x-samadhan-shopkeeper-reply", opening, map[string]any{"run_id": runID})
	})
	mw.WriteJSON(w, http.StatusCreated, map[string]any{
		"run_id": runID, "nexconn_direct_channel_id": run.DirectChannelID, "nexconn_access_token": tok.AccessToken,
		"sticker_price_paise": item.StickerPaise, "duration_sec": int(arenaDuration.Seconds()), "ends_at": isoTime(run.EndsAt),
		// extras
		"item_sku": item.SKU, "item_title": item.Title, "challenger_nexconn_id": u.NexconnUserID, "shopkeeper_nexconn_id": shopkeeperBotID,
		"app_key": tok.AppKey, "opening_text": opening, "token_mode": tok.Mode, "engine": tok.Engine,
	})
}

// API-16 POST /api/v1/arena/{runId}/bid (public)
func (s *Server) handleArenaBid(w http.ResponseWriter, r *http.Request) {
	run, ok := s.Store.GetArena(r.PathValue("runId"))
	if !ok {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_ARENA_NOT_FOUND", "arena run not found", false)
		return
	}
	var req struct {
		OfferedAmountPaise int64  `json:"offered_amount_paise"`
		MessageText        string `json:"message_text"`
		Locale             string `json:"locale"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if req.OfferedAmountPaise <= 0 {
		badRequest(w, r, "offered_amount_paise must be > 0")
		return
	}
	if len(req.MessageText) > 1000 {
		badRequest(w, r, "message_text max 1000 chars")
		return
	}
	run.Lock()
	defer run.Unlock()
	now := time.Now()
	if run.Won {
		mw.WriteError(w, r, http.StatusConflict, "ERR_ARENA_CLOSED", "deal already closed for this run", false)
		return
	}
	if now.After(run.EndsAt) {
		mw.WriteError(w, r, http.StatusGone, "ERR_ARENA_EXPIRED", "the 60-second arena run has expired", false)
		return
	}
	if req.Locale == "" {
		req.Locale = run.Locale
	}
	dec := DecideBid(run.StickerPaise, req.OfferedAmountPaise, run.LastCounterPaise, len(run.Turns), now.Sub(run.StartedAt))
	// PII never leaves Go unscrubbed, even towards the phrasing model.
	msg := s.Rust.ScrubPII(r.Context(), req.MessageText)
	reply, model, eng := s.Bridge.Shopkeeper(r.Context(), clients.ShopkeeperInput{
		ItemTitle: run.ItemTitle, StickerPricePaise: run.StickerPaise, CounterOfferPaise: dec.CounterPaise, Accepted: dec.Accepted,
		OfferedAmountPaise: req.OfferedAmountPaise, MessageText: msg.ScrubbedText, Locale: req.Locale,
	})
	st := s.Bridge.StreamDirect(r.Context(), shopkeeperBotID, run.ChallengerNexconn, "x-samadhan-shopkeeper-reply", reply,
		map[string]any{"run_id": run.ID, "counter_offer_paise": dec.CounterPaise, "deal_closed": dec.Accepted})
	run.Turns = append(run.Turns, store.ArenaTurn{OfferedPaise: req.OfferedAmountPaise, CounterPaise: dec.CounterPaise, Accepted: dec.Accepted,
		MessageText: msg.ScrubbedText, ReplyText: reply, StreamID: st.StreamID, At: now.UTC()})
	run.LastCounterPaise = dec.CounterPaise
	if dec.Accepted {
		run.Won, run.FinalPricePaise = true, dec.CounterPaise
	}
	s.Store.SaveArena(run)
	mw.WriteJSON(w, http.StatusAccepted, map[string]any{
		"run_id": run.ID, "deal_closed": dec.Accepted, "counter_offer_paise": dec.CounterPaise, "savings_bps": dec.SavingsBps, "stream_id": st.StreamID,
		// extras
		"reply_text": reply, "reply_model": model, "turns_used": len(run.Turns),
		"remaining_sec": max(0, int(run.EndsAt.Sub(now).Seconds())),
		"engine":        map[string]string{"pricing": "go-reservation-curve", "reply": eng, "stream": st.Engine},
	})
}

// GET /api/v1/arena/{runId} (public)
func (s *Server) handleArenaGet(w http.ResponseWriter, r *http.Request) {
	run, ok := s.Store.GetArena(r.PathValue("runId"))
	if !ok {
		mw.WriteError(w, r, http.StatusNotFound, "ERR_ARENA_NOT_FOUND", "arena run not found", false)
		return
	}
	run.Lock()
	defer run.Unlock()
	now := time.Now()
	status := "ACTIVE"
	switch {
	case run.Won:
		status = "WON"
	case now.After(run.EndsAt):
		status = "EXPIRED"
	}
	savings := 0
	if run.Won {
		savings = int((run.StickerPaise - run.FinalPricePaise) * 10000 / run.StickerPaise)
	}
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"run_id": run.ID, "status": status, "item_sku": run.ItemSKU, "item_title": run.ItemTitle,
		"challenger_name": run.ChallengerName, "challenger_nexconn_id": run.ChallengerNexconn,
		"nexconn_direct_channel_id": run.DirectChannelID, "sticker_price_paise": run.StickerPaise,
		"current_counter_paise": run.LastCounterPaise, "deal_closed": run.Won, "final_price_paise": run.FinalPricePaise,
		"savings_bps": savings, "turns": append([]store.ArenaTurn{}, run.Turns...), "opening_text": run.OpeningText,
		"started_at": isoTime(run.StartedAt), "ends_at": isoTime(run.EndsAt), "remaining_sec": max(0, int(run.EndsAt.Sub(now).Seconds())),
		"duration_sec": int(arenaDuration.Seconds()),
	})
}

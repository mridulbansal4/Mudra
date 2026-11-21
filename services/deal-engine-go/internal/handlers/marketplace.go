package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	mw "github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/middleware"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/store"
)

var subchannelTitles = map[string]string{
	"sub/machinery":     "Industrial Machinery & CNC",
	"sub/refurb-tech":   "Refurbished Laptops & GPUs",
	"sub/agri-mandi":    "Agri Mandi Equipment",
	"sub/campus-thrift": "Campus Thrift Exchange",
}

// API-12 GET /api/v1/marketplace/open-lots (public)
func (s *Server) handleOpenLots(w http.ResponseWriter, r *http.Request) {
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"open_channel_id":       store.OpenChannelID,
		"active_lots":           s.Store.ActiveLots(time.Now()),
		"community_subchannels": s.Store.Subchannels(),
	})
}

// API-13 POST /api/v1/marketplace/open-lots/broadcast (seller)
func (s *Server) handleBroadcastLot(w http.ResponseWriter, r *http.Request) {
	var req struct {
		OpenChannelID     string `json:"open_channel_id"`
		SellerNexconnID   string `json:"seller_nexconn_id"`
		Title             string `json:"title"`
		ReservePricePaise int64  `json:"reserve_price_paise"`
		DurationSec       int    `json:"duration_sec"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	c := claims(r)
	if req.OpenChannelID == "" {
		req.OpenChannelID = store.OpenChannelID
	}
	if req.SellerNexconnID == "" {
		req.SellerNexconnID = c.NexconnID
	}
	switch {
	case req.SellerNexconnID != c.NexconnID:
		mw.WriteError(w, r, http.StatusForbidden, "ERR_FORBIDDEN", "seller_nexconn_id must match the authenticated seller", false)
		return
	case strings.TrimSpace(req.Title) == "" || len(req.Title) > 200:
		badRequest(w, r, "title required (max 200 chars)")
		return
	case req.ReservePricePaise < 100:
		badRequest(w, r, "reserve_price_paise must be >= 100")
		return
	case req.DurationSec < 30 || req.DurationSec > 86400:
		badRequest(w, r, "duration_sec must be within 30..86400")
		return
	}
	ctx := r.Context()
	oc := s.Bridge.CreateOpenChannel(ctx, req.OpenChannelID)
	pb := s.Bridge.PriorityBroadcast(ctx, req.OpenChannelID, []string{req.SellerNexconnID})
	verified := false
	for _, d := range s.Store.ListDeals() {
		st, _ := d.Machine.Snapshot()
		if d.SellerID == c.Sub && (st == fsm.StateAssayVerified || st == fsm.StateReleased) {
			verified = true
			break
		}
	}
	lot := &store.OpenLot{
		LotID: "lot_" + slugify(req.Title) + "_" + store.RandHex(2), OpenChannelID: req.OpenChannelID, Title: req.Title,
		SellerNexconnID: req.SellerNexconnID, ReservePricePaise: req.ReservePricePaise, CurrentBidPaise: req.ReservePricePaise,
		AssayVerified: verified, EndsAt: time.Now().UTC().Add(time.Duration(req.DurationSec) * time.Second),
	}
	s.Store.AddLot(lot)
	mw.WriteJSON(w, http.StatusCreated, map[string]any{
		"lot_id": lot.LotID, "nexconn_open_channel_id": lot.OpenChannelID, "title": lot.Title, "seller_nexconn_id": lot.SellerNexconnID,
		"reserve_price_paise": lot.ReservePricePaise, "current_bid_paise": lot.CurrentBidPaise, "assay_verified": lot.AssayVerified,
		"ends_at": isoTime(lot.EndsAt), "priority_whitelisted": true,
		"engine": map[string]string{"open_create": oc.Engine, "priority_broadcast": pb.Engine},
	})
}

// API-14 POST /api/v1/community/subchannels
func (s *Server) handleSubchannel(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CommunityChannelID string `json:"community_channel_id"`
		CategorySlug       string `json:"category_slug"`
		Action             string `json:"action"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	title, ok := subchannelTitles[req.CategorySlug]
	if !ok {
		badRequest(w, r, "category_slug must be one of sub/machinery|sub/refurb-tech|sub/agri-mandi|sub/campus-thrift")
		return
	}
	if req.Action == "" {
		req.Action = "CREATE_OR_GET"
	}
	if req.Action != "CREATE_OR_GET" && req.Action != "JOIN" {
		badRequest(w, r, "action must be CREATE_OR_GET|JOIN")
		return
	}
	if req.CommunityChannelID == "" {
		req.CommunityChannelID = store.CommunityChannelID
	}
	sc, created := s.Store.GetOrCreateSubchannel(req.CategorySlug, func(n int) *store.Subchannel {
		base := strings.ReplaceAll(strings.TrimPrefix(req.CategorySlug, "sub/"), "-", "_")
		return &store.Subchannel{SubchannelID: "sub_" + base + "_" + twoDigits(n), Slug: req.CategorySlug, Title: title, CommunityChannelID: req.CommunityChannelID}
	}, true)
	engine := "existing"
	if created {
		engine = s.Bridge.CommunitySubchannel(r.Context(), req.CommunityChannelID, sc.SubchannelID).Engine
	}
	mw.WriteJSON(w, http.StatusOK, map[string]any{
		"community_channel_id": req.CommunityChannelID, "subchannel_id": sc.SubchannelID, "category_slug": sc.Slug,
		"joined": true, "created": created, "active_members": sc.ActiveMembers, "engine": engine,
	})
}

func twoDigits(n int) string { return fmt.Sprintf("%02d", n) }

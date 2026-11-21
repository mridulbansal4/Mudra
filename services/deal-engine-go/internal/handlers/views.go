package handlers

import (
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/store"
)

// EscrowContractView is EscrowContractSummary (+ umn).
type EscrowContractView struct {
	FSMState      string `json:"fsm_state"`
	AmountPaise   int64  `json:"amount_paise"`
	Currency      string `json:"currency"`
	Version       int64  `json:"version"`
	UPIMandateUMN string `json:"upi_mandate_umn,omitempty"`
}

// RecommendedSplit inside DisputeView / API-09.
type RecommendedSplit struct {
	BuyerRefundBps  int     `json:"buyer_refund_bps"`
	SellerPayoutBps int     `json:"seller_payout_bps"`
	BuyerRefundINR  float64 `json:"buyer_refund_inr"`
	SellerPayoutINR float64 `json:"seller_payout_inr"`
	Summary         string  `json:"summary,omitempty"`
	Rationale       string  `json:"rationale,omitempty"`
	Model           string  `json:"model,omitempty"`
	Engine          string  `json:"engine,omitempty"`
}

// DisputeView is used in DealView.dispute and the dispatch queue.
type DisputeView struct {
	DisputeID           string           `json:"dispute_id"`
	DealID              string           `json:"deal_id"`
	DealTitle           string           `json:"deal_title"`
	NexconnChannelID    string           `json:"nexconn_channel_id"`
	ReasonCode          string           `json:"reason_code"`
	Description         string           `json:"description"`
	HammingDistance     int              `json:"hamming_distance_phash"`
	PrePHashHex         string           `json:"pre_shipment_phash_hex"`
	PostPHashHex        string           `json:"post_delivery_phash_hex"`
	FreezeRemainingSec  int              `json:"freeze_remaining_sec"`
	RecommendedSplit    RecommendedSplit `json:"recommended_split"`
	Status              string           `json:"status"`
	ArbitratorNexconnID string           `json:"arbitrator_nexconn_id,omitempty"`
	FSMState            string           `json:"fsm_state"`
	Version             int64            `json:"version"`
	AmountPaise         int64            `json:"amount_paise"`
	FrozenAt            string           `json:"frozen_at"`
	JoinedAt            *string          `json:"joined_at,omitempty"`
	ResolvedAt          *string          `json:"resolved_at,omitempty"`
	ResolutionNote      string           `json:"resolution_note,omitempty"`
	FinalBuyerRefundBps *int             `json:"final_buyer_refund_bps,omitempty"`
}

// DealView is API-04 / list item / SSE `deal` payload.
type DealView struct {
	DealID              string                `json:"deal_id"`
	NexconnChannelID    string                `json:"nexconn_channel_id"`
	Title               string                `json:"title"`
	StoryStage          int                   `json:"story_stage"`
	EscrowContract      EscrowContractView    `json:"escrow_contract"`
	ChecklistItems      []store.ChecklistItem `json:"checklist_items"`
	AssayLogs           []store.AssayLog      `json:"assay_logs"`
	SystemVouchers      []store.Voucher       `json:"system_vouchers"`
	BuyerNexconnID      string                `json:"buyer_nexconn_id"`
	SellerNexconnID     string                `json:"seller_nexconn_id"`
	BuyerName           string                `json:"buyer_name"`
	SellerName          string                `json:"seller_name"`
	BuyerLocale         string                `json:"buyer_locale"`
	SellerLocale        string                `json:"seller_locale"`
	AllowedActions      []string              `json:"allowed_actions"`
	Messages            []store.ChatMessage   `json:"messages"`
	Dispute             *DisputeView          `json:"dispute"`
	IsFrozen            bool                  `json:"is_frozen"`
	FreezeRemainingSec  int                   `json:"freeze_remaining_sec"`
	RequiredSerialPlate string                `json:"required_serial_plate"`
	MinMotorRPM         float64               `json:"min_motor_rpm"`
	CreatedAt           string                `json:"created_at"`
	UpdatedAt           string                `json:"updated_at"`
}

func allowedActions(st fsm.State) []string {
	out := []string{}
	for _, a := range fsm.AllActions {
		if fsm.CanApply(st, a) {
			out = append(out, string(a))
		}
	}
	return out
}

func (s *Server) disputeViewOf(dp store.Dispute, d *store.Deal, now time.Time) DisputeView {
	st, ver := d.Machine.Snapshot()
	v := DisputeView{
		DisputeID: dp.ID, DealID: dp.DealID, DealTitle: d.Title, NexconnChannelID: d.ChannelID,
		ReasonCode: dp.ReasonCode, Description: dp.Description, HammingDistance: dp.HammingDistance,
		PrePHashHex: dp.PrePHash, PostPHashHex: dp.PostPHash,
		FreezeRemainingSec: dp.FreezeRemainingSec(now),
		RecommendedSplit: RecommendedSplit{
			BuyerRefundBps: dp.BuyerRefundBps, SellerPayoutBps: dp.SellerPayoutBps,
			BuyerRefundINR:  paiseToINR(d.AmountPaise * int64(dp.BuyerRefundBps) / 10000),
			SellerPayoutINR: paiseToINR(d.AmountPaise - d.AmountPaise*int64(dp.BuyerRefundBps)/10000),
			Summary:         dp.Summary, Rationale: dp.Rationale, Model: dp.TribunalModel, Engine: dp.TribunalEngine,
		},
		Status: dp.Status, ArbitratorNexconnID: dp.ArbitratorNexconnID, FSMState: string(st), Version: ver,
		AmountPaise: d.AmountPaise, FrozenAt: isoTime(dp.FrozenAt), ResolutionNote: dp.ResolutionNote, FinalBuyerRefundBps: dp.FinalBuyerBps,
	}
	if dp.JoinedAt != nil {
		t := isoTime(*dp.JoinedAt)
		v.JoinedAt = &t
	}
	if dp.ResolvedAt != nil {
		t := isoTime(*dp.ResolvedAt)
		v.ResolvedAt = &t
	}
	return v
}

// dealView builds a consistent snapshot of a deal.
func (s *Server) dealView(d *store.Deal) DealView {
	now := time.Now()
	var v DealView
	s.Store.ReadDeal(d, func(d *store.Deal) {
		st, ver := d.Machine.Snapshot()
		buyer, seller := s.Store.UserCopyUnsafe(d.BuyerID), s.Store.UserCopyUnsafe(d.SellerID)
		v = DealView{
			DealID: d.ID, NexconnChannelID: d.ChannelID, Title: d.Title, StoryStage: fsm.StoryStage(st),
			EscrowContract: EscrowContractView{FSMState: string(st), AmountPaise: d.AmountPaise, Currency: d.Currency, Version: ver, UPIMandateUMN: maskUMN(d.UPIMandateUMN)},
			ChecklistItems: append([]store.ChecklistItem{}, d.Checklist...),
			AssayLogs:      append([]store.AssayLog{}, d.AssayLogs...),
			SystemVouchers: append([]store.Voucher{}, d.Vouchers...),
			BuyerNexconnID: buyer.NexconnUserID, SellerNexconnID: seller.NexconnUserID,
			BuyerName: buyer.DisplayName, SellerName: seller.DisplayName, BuyerLocale: buyer.Locale, SellerLocale: seller.Locale,
			AllowedActions: allowedActions(st), Messages: append([]store.ChatMessage{}, d.Messages...),
			IsFrozen: d.IsFrozen, RequiredSerialPlate: d.RequiredSerial, MinMotorRPM: d.MinMotorRPM,
			CreatedAt: isoTime(d.CreatedAt), UpdatedAt: isoTime(d.UpdatedAt),
		}
		if d.DisputeID != "" {
			if dp, ok := s.Store.DisputeCopyUnsafe(d.DisputeID); ok {
				dv := s.disputeViewOf(dp, d, now)
				v.Dispute = &dv
				v.FreezeRemainingSec = dv.FreezeRemainingSec
			}
		}
	})
	return v
}

// maskUMN masks a UPI mandate reference per DATA_MODEL E-04 (****4821@upi).
func maskUMN(u string) string {
	if u == "" {
		return ""
	}
	at := len(u)
	for i := range u {
		if u[i] == '@' {
			at = i
			break
		}
	}
	local, dom := u[:at], u[at:]
	if len(local) <= 4 {
		return "****" + dom
	}
	return "****" + local[len(local)-4:] + dom
}

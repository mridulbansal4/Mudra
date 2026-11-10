// Package store is the mutex-protected in-memory store used at runtime
// (Postgres DDL lives in internal/db/migrations but is not wired in; see README).
package store

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/chanakya-team/samadhan-os/services/deal-engine-go/internal/fsm"
)

// User (E-01).
type User struct {
	ID            string    `json:"id"`
	NexconnUserID string    `json:"nexconn_user_id"`
	DisplayName   string    `json:"display_name"`
	Role          string    `json:"role"`
	Locale        string    `json:"preferred_locale"`
	KYCTier       string    `json:"kyc_tier"`
	TokenMode     string    `json:"-"`
	CreatedAt     time.Time `json:"created_at"`
}

// ChecklistItem in an escrow contract.
type ChecklistItem struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Verified bool   `json:"verified"`
}

// ChatMessage (E-05) — raw_text is always the PII-scrubbed source text.
type ChatMessage struct {
	ID              string         `json:"id"`
	DealID          string         `json:"deal_id"`
	SenderRole      string         `json:"sender_role"`
	SenderName      string         `json:"sender_name"`
	SenderNexconnID string         `json:"sender_nexconn_id,omitempty"`
	MessageType     string         `json:"message_type"`
	SourceLocale    string         `json:"source_locale"`
	TargetLocale    string         `json:"target_locale"`
	RawText         string         `json:"raw_text"`
	TranslatedText  string         `json:"translated_text"`
	ExtractedTerms  map[string]any `json:"extracted_terms"`
	PIIRedacted     int            `json:"pii_redacted_count"`
	StreamID        string         `json:"stream_id,omitempty"`
	Engine          string         `json:"engine,omitempty"`
	Extras          map[string]any `json:"extras"`
	CreatedAt       time.Time      `json:"created_at"`
}

// AssayLog (E-06).
type AssayLog struct {
	ID                 string    `json:"id"`
	NexconnCallID      string    `json:"nexconn_call_id"`
	StageTag           string    `json:"stage_tag"`
	AssayPassed        bool      `json:"assay_passed"`
	FramePHashHex      string    `json:"frame_phash_hex"`
	BlurLaplacian      *float64  `json:"blur_laplacian_score,omitempty"`
	AudioFFTRPMPeak    *float64  `json:"audio_fft_rpm_peak"`
	RPMSource          string    `json:"rpm_source,omitempty"`
	DetectedSerialText string    `json:"detected_serial_text"`
	RustComputeMs      float64   `json:"rust_compute_ms"`
	FSMState           string    `json:"fsm_state"`
	Ed25519SigHex      string    `json:"ed25519_sig_hex"`
	FailureReasons     []string  `json:"failure_reasons"`
	Engine             string    `json:"engine"`
	CreatedAt          time.Time `json:"created_at"`
}

// Voucher (E-08).
type Voucher struct {
	ID                string         `json:"id"`
	VoucherType       string         `json:"voucher_type"`
	PrevVoucherSHA256 string         `json:"prev_voucher_sha256"`
	CurrVoucherSHA256 string         `json:"curr_voucher_sha256"`
	Ed25519Signature  string         `json:"ed25519_signature"`
	PublicKeyHex      string         `json:"public_key_hex"`
	Payload           map[string]any `json:"payload"`
	Engine            string         `json:"engine"`
	CreatedAt         time.Time      `json:"created_at"`
}

// Dispute (E-07).
type Dispute struct {
	ID                  string
	DealID              string
	ReasonCode          string
	Description         string
	PrePHash            string
	PostPHash           string
	HammingDistance     int
	BuyerRefundBps      int
	SellerPayoutBps     int
	Summary             string
	Rationale           string
	TribunalModel       string
	TribunalEngine      string
	Status              string // FROZEN_OPEN | ARBITRATOR_ASSIGNED | SETTLED_BINDING
	ArbitratorNexconnID string
	FrozenAt            time.Time
	FreezeExpiresAt     time.Time
	JoinedAt            *time.Time
	ResolvedAt          *time.Time
	ResolutionNote      string
	FinalBuyerBps       *int
}

// FreezeRemainingSec counts down the 90 s freeze window.
func (d *Dispute) FreezeRemainingSec(now time.Time) int {
	if d.Status == "SETTLED_BINDING" {
		return 0
	}
	r := int(d.FreezeExpiresAt.Sub(now).Seconds() + 0.999)
	return max(0, r)
}

// AssayChallenge issued by API-07.
type AssayChallenge struct {
	Nonce     string
	StageTag  string
	ExpiresAt time.Time
}

// Deal combines E-03 deal room + E-04 escrow contract.
type Deal struct {
	ID             string
	ChannelID      string
	Title          string
	BuyerID        string
	SellerID       string
	ArbitratorID   string
	Machine        *fsm.Machine
	AmountPaise    int64
	Currency       string
	Checklist      []ChecklistItem
	UPIMandateUMN  string
	IsFrozen       bool
	RequiredSerial string
	MinMotorRPM    float64
	ReferencePHash string
	Challenge      *AssayChallenge
	Messages       []ChatMessage
	AssayLogs      []AssayLog
	Vouchers       []Voucher
	DisputeID      string
	CreatedAt      time.Time
	UpdatedAt      time.Time

	// Op serialises whole mutation flows (FSM CAS + voucher chain + side effects)
	// so the hash chain order always matches FSM order. Never held with Store.mu
	// across network calls in the other direction (Op is always taken first).
	Op sync.Mutex
}

// LastVoucherHash returns the chain head (genesis if none).
func (d *Deal) LastVoucherHash() string {
	if n := len(d.Vouchers); n > 0 {
		return d.Vouchers[n-1].CurrVoucherSHA256
	}
	return ""
}

// ArenaTurn is one bid/counter exchange.
type ArenaTurn struct {
	OfferedPaise int64     `json:"offered_amount_paise"`
	CounterPaise int64     `json:"counter_offer_paise"`
	Accepted     bool      `json:"accepted"`
	MessageText  string    `json:"message_text"`
	ReplyText    string    `json:"reply_text"`
	StreamID     string    `json:"stream_id"`
	At           time.Time `json:"at"`
}

// ArenaRun (E-10).
type ArenaRun struct {
	ID                string
	UserID            string
	ChallengerName    string
	ChallengerNexconn string
	Locale            string
	DirectChannelID   string
	ItemSKU           string
	ItemTitle         string
	StickerPaise      int64
	LastCounterPaise  int64
	Turns             []ArenaTurn
	Won               bool
	FinalPricePaise   int64
	StartedAt         time.Time
	EndsAt            time.Time
	OpeningText       string
	TokenEngine       string
	mu                sync.Mutex
}

// Lock/Unlock the run.
func (r *ArenaRun) Lock()   { r.mu.Lock() }
func (r *ArenaRun) Unlock() { r.mu.Unlock() }

// OpenLot (E-09).
type OpenLot struct {
	LotID             string    `json:"lot_id"`
	OpenChannelID     string    `json:"nexconn_open_channel_id"`
	Title             string    `json:"title"`
	SellerNexconnID   string    `json:"seller_nexconn_id"`
	ReservePricePaise int64     `json:"reserve_price_paise"`
	CurrentBidPaise   int64     `json:"current_bid_paise"`
	AssayVerified     bool      `json:"assay_verified"`
	EndsAt            time.Time `json:"ends_at"`
}

// Subchannel is a Community category subchannel.
type Subchannel struct {
	SubchannelID       string `json:"subchannel_id"`
	Slug               string `json:"slug"`
	Title              string `json:"title"`
	ActiveMembers      int    `json:"active_members"`
	CommunityChannelID string `json:"-"`
}

// Store is the in-memory database.
type Store struct {
	mu           sync.RWMutex
	users        map[string]*User // by ID
	usersByNx    map[string]*User // by nexconn id
	deals        map[string]*Deal
	dealOrder    []string
	disputes     map[string]*Dispute
	arena        map[string]*ArenaRun
	lots         []*OpenLot
	subchannels  []*Subchannel
	openChannels map[string]bool
	webhookSeen  map[string][]byte
	seq          int64
	Telemetry    *Telemetry
}

// New creates an empty store.
func New() *Store {
	return &Store{
		users: map[string]*User{}, usersByNx: map[string]*User{}, deals: map[string]*Deal{},
		disputes: map[string]*Dispute{}, arena: map[string]*ArenaRun{}, openChannels: map[string]bool{},
		webhookSeen: map[string][]byte{}, Telemetry: NewTelemetry(),
	}
}

// RandHex returns n random bytes hex encoded.
func RandHex(n int) string {
	b := make([]byte, n)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// NewUUID returns a random RFC 4122 v4 UUID string.
func NewUUID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// NextSeq returns a monotonically increasing number.
func (s *Store) NextSeq() int64 {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.seq++
	return s.seq
}

// ---- users ----

// PutUser inserts or replaces a user.
func (s *Store) PutUser(u *User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.users[u.ID] = u
	s.usersByNx[u.NexconnUserID] = u
}

// GetUser by internal ID.
func (s *Store) GetUser(id string) (*User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.users[id]
	return u, ok
}

// GetUserByNexconn by nexconn user id.
func (s *Store) GetUserByNexconn(nx string) (*User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.usersByNx[nx]
	return u, ok
}

// UserCopy returns a value copy (zero value if missing).
func (s *Store) UserCopy(id string) User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if u, ok := s.users[id]; ok {
		return *u
	}
	return User{}
}

// UserCopyUnsafe is UserCopy for callers already holding the store lock
// (inside ReadDeal/UpdateDeal callbacks).
func (s *Store) UserCopyUnsafe(id string) User {
	if u, ok := s.users[id]; ok {
		return *u
	}
	return User{}
}

// DisputeCopyUnsafe is DisputeCopy for callers already holding the store lock.
func (s *Store) DisputeCopyUnsafe(id string) (Dispute, bool) {
	d, ok := s.disputes[id]
	if !ok {
		return Dispute{}, false
	}
	return *d, true
}

// ---- deals ----

// PutDeal inserts a deal.
func (s *Store) PutDeal(d *Deal) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if _, exists := s.deals[d.ID]; !exists {
		s.dealOrder = append(s.dealOrder, d.ID)
	}
	s.deals[d.ID] = d
}

// GetDeal returns the live pointer (use Read/Update for field access).
func (s *Store) GetDeal(id string) (*Deal, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.deals[id]
	return d, ok
}

// ReadDeal runs fn under the read lock.
func (s *Store) ReadDeal(d *Deal, fn func(*Deal)) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	fn(d)
}

// UpdateDeal runs fn under the write lock and bumps UpdatedAt.
func (s *Store) UpdateDeal(d *Deal, fn func(*Deal)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fn(d)
	d.UpdatedAt = time.Now().UTC()
}

// ListDeals returns deals newest first.
func (s *Store) ListDeals() []*Deal {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Deal, 0, len(s.dealOrder))
	for i := len(s.dealOrder) - 1; i >= 0; i-- {
		out = append(out, s.deals[s.dealOrder[i]])
	}
	return out
}

// ---- disputes ----

// PutDispute inserts a dispute.
func (s *Store) PutDispute(d *Dispute) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.disputes[d.ID] = d
}

// GetDispute returns a dispute pointer.
func (s *Store) GetDispute(id string) (*Dispute, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.disputes[id]
	return d, ok
}

// DisputeCopy returns a value copy.
func (s *Store) DisputeCopy(id string) (Dispute, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	d, ok := s.disputes[id]
	if !ok {
		return Dispute{}, false
	}
	return *d, true
}

// UpdateDispute mutates under the write lock.
func (s *Store) UpdateDispute(d *Dispute, fn func(*Dispute)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	fn(d)
}

// ListDisputes returns copies, open ones first then newest first.
func (s *Store) ListDisputes() []Dispute {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Dispute, 0, len(s.disputes))
	for _, d := range s.disputes {
		out = append(out, *d)
	}
	sort.Slice(out, func(i, j int) bool {
		oi, oj := out[i].Status != "SETTLED_BINDING", out[j].Status != "SETTLED_BINDING"
		if oi != oj {
			return oi
		}
		return out[i].FrozenAt.After(out[j].FrozenAt)
	})
	return out
}

// ---- arena ----

// PutArena stores a run.
func (s *Store) PutArena(r *ArenaRun) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.arena[r.ID] = r
}

// GetArena returns a run.
func (s *Store) GetArena(id string) (*ArenaRun, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	r, ok := s.arena[id]
	return r, ok
}

// ArenaCount returns number of runs.
func (s *Store) ArenaCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.arena)
}

// ---- marketplace ----

// AddLot appends a lot.
func (s *Store) AddLot(l *OpenLot) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.lots = append(s.lots, l)
	s.openChannels[l.OpenChannelID] = true
}

// ActiveLots returns copies of non-expired lots (newest first).
func (s *Store) ActiveLots(now time.Time) []OpenLot {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := []OpenLot{}
	for i := len(s.lots) - 1; i >= 0; i-- {
		if s.lots[i].EndsAt.After(now) {
			out = append(out, *s.lots[i])
		}
	}
	return out
}

// OpenChannelCount counts distinct Open channels.
func (s *Store) OpenChannelCount() int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.openChannels)
}

// Subchannels returns copies.
func (s *Store) Subchannels() []Subchannel {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Subchannel, 0, len(s.subchannels))
	for _, sc := range s.subchannels {
		out = append(out, *sc)
	}
	return out
}

// GetOrCreateSubchannel finds by slug or creates via mk. Returns copy and created flag.
func (s *Store) GetOrCreateSubchannel(slug string, mk func(n int) *Subchannel, join bool) (Subchannel, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, sc := range s.subchannels {
		if sc.Slug == slug {
			if join {
				sc.ActiveMembers++
			}
			return *sc, false
		}
	}
	sc := mk(len(s.subchannels) + 1)
	if join {
		sc.ActiveMembers++
	}
	s.subchannels = append(s.subchannels, sc)
	return *sc, true
}

// ---- webhooks ----

// WebhookSeen returns cached response for an event id.
func (s *Store) WebhookSeen(eventID string) ([]byte, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	b, ok := s.webhookSeen[eventID]
	return b, ok
}

// RecordWebhook caches the response for an event id.
func (s *Store) RecordWebhook(eventID string, resp []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.webhookSeen[eventID] = resp
}

// Counts for telemetry.
type Counts struct {
	Users, Deals, Vouchers, Subchannels, ArenaRuns, OpenChannels, Disputes int
}

// Counts returns live entity counts.
func (s *Store) Counts() Counts {
	s.mu.RLock()
	defer s.mu.RUnlock()
	c := Counts{Users: len(s.users), Deals: len(s.deals), Subchannels: len(s.subchannels), ArenaRuns: len(s.arena), OpenChannels: len(s.openChannels), Disputes: len(s.disputes)}
	for _, d := range s.deals {
		c.Vouchers += len(d.Vouchers)
	}
	return c
}

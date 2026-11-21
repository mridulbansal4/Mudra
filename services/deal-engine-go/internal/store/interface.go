package store

import (
	"context"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
)

// Backend store identifiers exposed by GET /health.
const (
	BackendInMemory   = "in-memory"
	BackendPostgreSQL = "postgresql"
)

// VoucherMintFunc signs and formats the voucher and timeline card inside ApplyTransition.
type VoucherMintFunc func(prevHash string, res fsm.Result, amountPaise int64) (Voucher, ChatMessage, error)

// StoreInterface abstracts Deal Engine persistence across MemoryStore and PostgresStore.
type StoreInterface interface {
	// Backend metadata & lifecycle
	BackendName() string
	Telemetry() *Telemetry
	Close() error
	SeedStatic(now time.Time)

	// Users & Sessions (E-01, E-02)
	PutUser(u *User)
	GetUser(id string) (*User, bool)
	GetUserByNexconn(nx string) (*User, bool)
	UserCopy(id string) User
	UserCopyUnsafe(id string) User
	RecordSession(userID, nexconnUserID, accessToken, platform, mode string, expiresInSec int64)

	// Deals & Escrow Contracts (E-03, E-04, E-05, E-06, E-08)
	PutDeal(d *Deal)
	GetDeal(id string) (*Deal, bool)
	ReadDeal(d *Deal, fn func(*Deal))
	UpdateDeal(d *Deal, fn func(*Deal))
	ListDeals() []*Deal
	ApplyTransition(ctx context.Context, d *Deal, act fsm.Action, expectedVersion int64, mint VoucherMintFunc) (fsm.Result, Voucher, ChatMessage, error)

	// Disputes (E-07)
	PutDispute(d *Dispute)
	GetDispute(id string) (*Dispute, bool)
	DisputeCopy(id string) (Dispute, bool)
	DisputeCopyUnsafe(id string) (Dispute, bool)
	UpdateDispute(d *Dispute, fn func(*Dispute))
	ListDisputes() []Dispute

	// Bargain Arena (E-10)
	PutArena(r *ArenaRun)
	SaveArena(r *ArenaRun)
	GetArena(id string) (*ArenaRun, bool)
	ArenaCount() int

	// Marketplace & Community Subchannels (E-09)
	AddLot(l *OpenLot)
	ActiveLots(now time.Time) []OpenLot
	OpenChannelCount() int
	Subchannels() []Subchannel
	GetOrCreateSubchannel(slug string, mk func(n int) *Subchannel, join bool) (Subchannel, bool)

	// Webhooks & Counts (API-17, API-18)
	WebhookSeen(eventID string) ([]byte, bool)
	RecordWebhook(eventID string, resp []byte)
	Counts() Counts
}

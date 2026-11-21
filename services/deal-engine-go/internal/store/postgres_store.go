package store

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/fsm"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/hrtime"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// PostgresOptions configures PostgresStore connection pooling.
type PostgresOptions struct {
	DatabaseURL string
	MaxConns    int32
	MinConns    int32
	Schema      string // optional isolated schema name for integration tests
}

type dealMetaJSON struct {
	RequiredSerial string          `json:"required_serial,omitempty"`
	MinMotorRPM    float64         `json:"min_motor_rpm,omitempty"`
	ReferencePHash string          `json:"reference_phash,omitempty"`
	DisputeID      string          `json:"dispute_id,omitempty"`
	Challenge      *AssayChallenge `json:"challenge,omitempty"`
}

type msgMetaJSON struct {
	SenderRole   string         `json:"sender_role,omitempty"`
	SenderName   string         `json:"sender_name,omitempty"`
	SenderNxOrig string         `json:"sender_nexconn_id_orig,omitempty"`
	SrcLocOrig   string         `json:"source_locale_orig,omitempty"`
	DstLocOrig   string         `json:"target_locale_orig,omitempty"`
	PIIRedacted  int            `json:"pii_redacted_count,omitempty"`
	StreamID     string         `json:"stream_id,omitempty"`
	Engine       string         `json:"engine,omitempty"`
	Extras       map[string]any `json:"extras,omitempty"`
}

type assayMetaJSON struct {
	AssayID        string   `json:"assay_id,omitempty"`
	NexconnCallID  string   `json:"nexconn_call_id,omitempty"`
	RPMSource      string   `json:"rpm_source,omitempty"`
	RustComputeMs  float64  `json:"rust_compute_ms,omitempty"`
	FSMState       string   `json:"fsm_state,omitempty"`
	FailureReasons []string `json:"failure_reasons,omitempty"`
	Engine         string   `json:"engine,omitempty"`
}

type disputeMetaJSON struct {
	DisputeID           string     `json:"dispute_id,omitempty"`
	PrePHash            string     `json:"pre_phash,omitempty"`
	PostPHash           string     `json:"post_phash,omitempty"`
	Summary             string     `json:"summary,omitempty"`
	Rationale           string     `json:"rationale,omitempty"`
	TribunalModel       string     `json:"model,omitempty"`
	TribunalEngine      string     `json:"engine,omitempty"`
	ArbitratorNexconnID string     `json:"arbitrator_nexconn_id,omitempty"`
	JoinedAt            *time.Time `json:"joined_at,omitempty"`
	ResolutionNote      string     `json:"resolution_note,omitempty"`
	FinalBuyerBps       *int       `json:"final_buyer_bps,omitempty"`
}

type arenaMetaJSON struct {
	ChallengerName    string      `json:"challenger_name,omitempty"`
	ChallengerNexconn string      `json:"challenger_nexconn,omitempty"`
	Locale            string      `json:"locale,omitempty"`
	ItemTitle         string      `json:"item_title,omitempty"`
	LastCounterPaise  int64       `json:"last_counter_paise,omitempty"`
	Turns             []ArenaTurn `json:"turns,omitempty"`
	FinalPricePaise   int64       `json:"final_price_paise,omitempty"`
	EndsAt            time.Time   `json:"ends_at"`
	OpeningText       string      `json:"opening_text,omitempty"`
	TokenEngine       string      `json:"token_engine,omitempty"`
}

// PostgresStore implements StoreInterface backed by Supabase PostgreSQL (pgx/v5).
type PostgresStore struct {
	pool      *pgxpool.Pool
	telemetry *Telemetry

	mu        sync.RWMutex
	users     map[string]*User // by User.ID ("e01_...")
	usersByNx map[string]*User // by nexconn_user_id
	deals     map[string]*Deal // singleton *Deal per Deal.ID so d.Op.Lock() serializes in-process callers
	dealOrder []string
	disputes  map[string]*Dispute
	arena     map[string]*ArenaRun
}

var _ StoreInterface = (*PostgresStore)(nil)

// NewPostgresStore connects to PostgreSQL, verifies/extends schema idempotently, and hydrates active state.
func NewPostgresStore(parentCtx context.Context, opts PostgresOptions) (*PostgresStore, error) {
	dsn := strings.TrimSpace(opts.DatabaseURL)
	if dsn == "" {
		return nil, errors.New("DATABASE_URL is empty")
	}
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	maxConns := opts.MaxConns
	if maxConns <= 0 {
		maxConns = 25
	}
	minConns := opts.MinConns
	if minConns <= 0 {
		minConns = 5
	}
	if minConns > maxConns {
		minConns = maxConns
	}
	cfg.MaxConns = maxConns
	cfg.MinConns = minConns
	cfg.MaxConnLifetime = 15 * time.Minute
	cfg.MaxConnIdleTime = 5 * time.Minute
	cfg.HealthCheckPeriod = 1 * time.Minute

	// Avoid server-side named prepared statement collisions on Supabase Supavisor / PgBouncer.
	if cfg.ConnConfig.Port == 6543 || strings.Contains(cfg.ConnConfig.Host, "pooler.supabase.com") {
		cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeExec
	}
	if opts.Schema != "" && isValidIdent(opts.Schema) {
		searchPath := opts.Schema + ",extensions,public"
		cfg.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
			_, err := conn.Exec(ctx, "SET search_path TO "+searchPath, pgx.QueryExecModeSimpleProtocol)
			return err
		}
	}

	ctx, cancel := context.WithTimeout(parentCtx, 12*time.Second)
	defer cancel()

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create pgxpool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		// Supabase Supavisor shard resilience: if aws-0-<region>.pooler.supabase.com
		// reports tenant/user not found, transparently retry aws-1-<region>.pooler.supabase.com.
		if strings.HasPrefix(cfg.ConnConfig.Host, "aws-0-") &&
			strings.HasSuffix(cfg.ConnConfig.Host, ".pooler.supabase.com") &&
			strings.Contains(err.Error(), "not found") {
			altHost := "aws-1-" + strings.TrimPrefix(cfg.ConnConfig.Host, "aws-0-")
			slog.Warn("Supabase aws-0 pooler shard reported tenant not found; retrying aws-1 shard", "alt_host", altHost)
			cfg.ConnConfig.Host = altHost
			pool, err = pgxpool.NewWithConfig(ctx, cfg)
			if err != nil {
				return nil, fmt.Errorf("create pgxpool (%s): %w", altHost, err)
			}
			if pingErr := pool.Ping(ctx); pingErr != nil {
				pool.Close()
				return nil, fmt.Errorf("ping postgresql (%s): %w", altHost, pingErr)
			}
		} else {
			return nil, fmt.Errorf("ping postgresql: %w", err)
		}
	}
	if err := ensureSchema(ctx, pool, opts.Schema); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ensure postgresql schema: %w", err)
	}

	ps := &PostgresStore{
		pool:      pool,
		telemetry: NewTelemetry(),
		users:     map[string]*User{},
		usersByNx: map[string]*User{},
		deals:     map[string]*Deal{},
		disputes:  map[string]*Dispute{},
		arena:     map[string]*ArenaRun{},
	}
	if err := ps.hydrateAll(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("hydrate postgresql state: %w", err)
	}

	// Wire asynchronous telemetry sink into traction_telemetry_events.
	ps.telemetry.SetSink(func(eventType string, metricMs *float64, attrs map[string]any) {
		go func() {
			tctx, tcancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer tcancel()
			_, _ = ps.pool.Exec(tctx,
				`INSERT INTO traction_telemetry_events (event_type, metric_ms, attributes) VALUES ($1, $2, $3::jsonb)`,
				eventType, metricMs, string(marshalJSONOrEmptyObj(attrs)))
		}()
	})

	return ps, nil
}

// Pool exposes the underlying pgxpool.Pool (used for health diagnostics and trigger integration tests).
func (p *PostgresStore) Pool() *pgxpool.Pool { return p.pool }

// BackendName reports "postgresql" for GET /health.
func (p *PostgresStore) BackendName() string { return BackendPostgreSQL }

// Telemetry returns the telemetry collector.
func (p *PostgresStore) Telemetry() *Telemetry { return p.telemetry }

// Close gracefully closes the connection pool.
func (p *PostgresStore) Close() error {
	if p.pool != nil {
		p.pool.Close()
	}
	return nil
}

func (p *PostgresStore) opCtx() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), 5*time.Second)
}

// SeedStatic inserts personas, open flash lot, and community subchannels idempotently (ON CONFLICT DO NOTHING).
func (p *PostgresStore) SeedStatic(now time.Time) {
	ctx, cancel := p.opCtx()
	defer cancel()

	for _, per := range Personas {
		u := &User{
			ID: per.ID, NexconnUserID: per.NexconnID, DisplayName: per.Name,
			Role: per.Role, Locale: per.Locale, KYCTier: "GUEST_SANDBOX", CreatedAt: now,
		}
		_, err := p.pool.Exec(ctx, `
			INSERT INTO users (id, nexconn_user_id, display_name, role, preferred_locale, kyc_tier, created_at)
			VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
			ON CONFLICT DO NOTHING`,
			UserUUID(u.ID), u.NexconnUserID, u.DisplayName, normalizeRole(u.Role), normalizeLocale(u.Locale), normalizeKYCTier(u.KYCTier), u.CreatedAt,
		)
		if err != nil {
			slog.Warn("seed user failed", "nexconn_user_id", u.NexconnUserID, "err", err)
		}
		// Ensure in-memory user map holds the authoritative DB UUID if row pre-existed.
		var dbUUID string
		if err := p.pool.QueryRow(ctx, `SELECT id::text FROM users WHERE nexconn_user_id = $1`, u.NexconnUserID).Scan(&dbUUID); err == nil {
			u.ID = FormatUserID(dbUUID)
		}
		p.mu.Lock()
		p.users[u.ID] = u
		p.usersByNx[u.NexconnUserID] = u
		p.mu.Unlock()
	}

	// Seed default community subchannels idempotently.
	defaultSubs := []Subchannel{
		{SubchannelID: "sub_machinery_01", Slug: "sub/machinery", Title: "Industrial Machinery & CNC", ActiveMembers: 312, CommunityChannelID: CommunityChannelID},
		{SubchannelID: "sub_refurb_02", Slug: "sub/refurb-tech", Title: "Refurbished Laptops & GPUs", ActiveMembers: 489, CommunityChannelID: CommunityChannelID},
	}
	for _, sc := range defaultSubs {
		_, err := p.pool.Exec(ctx, `
			INSERT INTO community_subchannels (subchannel_id, slug, title, active_members, community_channel_id)
			VALUES ($1, $2, $3, $4, $5)
			ON CONFLICT DO NOTHING`,
			sc.SubchannelID, sc.Slug, sc.Title, sc.ActiveMembers, sc.CommunityChannelID,
		)
		if err != nil {
			slog.Warn("seed subchannel failed", "slug", sc.Slug, "err", err)
		}
	}

	// Seed default Juki open flash lot idempotently (refreshing expiry if expired so demo lot stays visible).
	vikram, ok := p.GetUserByNexconn("seller_vikram_hi_8821")
	if ok {
		lotID := "lot_juki_8821"
		_, err := p.pool.Exec(ctx, `
			INSERT INTO open_flash_lots (
				id, external_id, nexconn_open_channel_id, community_subchannel_id,
				seller_user_id, title, ask_amount_paise, current_bid_paise,
				assay_verified, is_priority_whitelisted, expires_at
			) VALUES ($1::uuid, $2, $3, $4, $5::uuid, $6, $7, $8, $9, $10, $11)
			ON CONFLICT (id) DO UPDATE
			SET expires_at = CASE WHEN open_flash_lots.expires_at < NOW() THEN EXCLUDED.expires_at ELSE open_flash_lots.expires_at END`,
			LotUUID(lotID), lotID, OpenChannelID, "sub_machinery_01",
			UserUUID(vikram.ID), "Juki MO-6814S Overlock Lot (Assay Verified 4,820 RPM)",
			int64(14000000), int64(14500000), true, true, now.Add(6*time.Hour),
		)
		if err != nil {
			slog.Warn("seed open lot failed", "lot_id", lotID, "err", err)
		}
	}
}

// ---- Users & Sessions (E-01, E-02) ----

func (p *PostgresStore) PutUser(u *User) {
	if u.CreatedAt.IsZero() {
		u.CreatedAt = time.Now().UTC()
	}
	uuidStr := UserUUID(u.ID)
	u.ID = FormatUserID(uuidStr)

	ctx, cancel := p.opCtx()
	defer cancel()
	var returnedUUID string
	err := p.pool.QueryRow(ctx, `
		INSERT INTO users (id, nexconn_user_id, display_name, role, preferred_locale, kyc_tier, created_at)
		VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)
		ON CONFLICT (nexconn_user_id) DO UPDATE
		SET display_name = EXCLUDED.display_name, preferred_locale = EXCLUDED.preferred_locale
		RETURNING id::text`,
		uuidStr, u.NexconnUserID, u.DisplayName, normalizeRole(u.Role), normalizeLocale(u.Locale), normalizeKYCTier(u.KYCTier), u.CreatedAt,
	).Scan(&returnedUUID)
	if err != nil {
		slog.Error("PostgresStore.PutUser failed", "nexconn_user_id", u.NexconnUserID, "err", err)
	} else if returnedUUID != "" {
		u.ID = FormatUserID(returnedUUID)
	}

	p.mu.Lock()
	cp := *u
	p.users[u.ID] = &cp
	p.usersByNx[u.NexconnUserID] = &cp
	p.mu.Unlock()
}

func (p *PostgresStore) GetUser(id string) (*User, bool) {
	ctx, cancel := p.opCtx()
	defer cancel()
	var dbUUID, nx, name, role, loc, kyc string
	var createdAt time.Time
	err := p.pool.QueryRow(ctx, `
		SELECT id::text, nexconn_user_id, display_name, role, preferred_locale, kyc_tier, created_at
		FROM users WHERE id = $1::uuid`, UserUUID(id),
	).Scan(&dbUUID, &nx, &name, &role, &loc, &kyc, &createdAt)
	if err != nil {
		p.mu.RLock()
		u, ok := p.users[id]
		p.mu.RUnlock()
		return u, ok
	}
	u := &User{
		ID: FormatUserID(dbUUID), NexconnUserID: nx, DisplayName: name,
		Role: role, Locale: loc, KYCTier: kyc, CreatedAt: createdAt,
	}
	p.mu.Lock()
	p.users[u.ID] = u
	p.usersByNx[u.NexconnUserID] = u
	p.mu.Unlock()
	return u, true
}

func (p *PostgresStore) GetUserByNexconn(nx string) (*User, bool) {
	ctx, cancel := p.opCtx()
	defer cancel()
	var dbUUID, nxID, name, role, loc, kyc string
	var createdAt time.Time
	err := p.pool.QueryRow(ctx, `
		SELECT id::text, nexconn_user_id, display_name, role, preferred_locale, kyc_tier, created_at
		FROM users WHERE nexconn_user_id = $1`, nx,
	).Scan(&dbUUID, &nxID, &name, &role, &loc, &kyc, &createdAt)
	if err != nil {
		p.mu.RLock()
		u, ok := p.usersByNx[nx]
		p.mu.RUnlock()
		return u, ok
	}
	u := &User{
		ID: FormatUserID(dbUUID), NexconnUserID: nxID, DisplayName: name,
		Role: role, Locale: loc, KYCTier: kyc, CreatedAt: createdAt,
	}
	p.mu.Lock()
	p.users[u.ID] = u
	p.usersByNx[u.NexconnUserID] = u
	p.mu.Unlock()
	return u, true
}

func (p *PostgresStore) UserCopy(id string) User {
	if u, ok := p.GetUser(id); ok {
		return *u
	}
	return User{}
}

func (p *PostgresStore) UserCopyUnsafe(id string) User {
	if u, ok := p.users[id]; ok {
		return *u
	}
	return User{}
}

func (p *PostgresStore) RecordSession(userID, nexconnUserID, accessToken, platform, mode string, expiresInSec int64) {
	if expiresInSec <= 0 {
		expiresInSec = 86400
	}
	tokenHash := sha256Hex(accessToken)
	isMAU := mode == "live"
	expiresAt := time.Now().UTC().Add(time.Duration(expiresInSec) * time.Second)
	plat := normalizePlatform(platform)
	uUUID := UserUUID(userID)

	go func() {
		ctx, cancel := p.opCtx()
		defer cancel()
		_, _ = p.pool.Exec(ctx, `
			INSERT INTO nexconn_sessions (user_id, nexconn_user_id, token_sha256, client_platform, is_connected_mau, expires_at)
			VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
			uUUID, nexconnUserID, tokenHash, plat, isMAU, expiresAt,
		)
	}()
}

// ---- Deals & Escrow Contracts (E-03, E-04, E-05, E-06, E-08) ----

func (p *PostgresStore) PutDeal(d *Deal) {
	if d.CreatedAt.IsZero() {
		d.CreatedAt = time.Now().UTC()
	}
	if d.UpdatedAt.IsZero() {
		d.UpdatedAt = d.CreatedAt
	}
	st, ver := d.Machine.Snapshot()
	meta := dealMetaJSON{
		RequiredSerial: d.RequiredSerial,
		MinMotorRPM:    d.MinMotorRPM,
		ReferencePHash: d.ReferencePHash,
		DisputeID:      d.DisputeID,
		Challenge:      d.Challenge,
	}
	var arbUUID *string
	if d.ArbitratorID != "" {
		a := UserUUID(d.ArbitratorID)
		arbUUID = &a
	}
	var umn *string
	if d.UPIMandateUMN != "" {
		u := d.UPIMandateUMN
		umn = &u
	}
	curr := d.Currency
	if curr == "" {
		curr = "INR"
	}

	ctx, cancel := p.opCtx()
	defer cancel()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		slog.Error("PostgresStore.PutDeal begin tx failed", "deal_id", d.ID, "err", err)
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	dealUUID := DealUUID(d.ID)
	escrowUUID := EscrowUUID(d.ID)
	_, err = tx.Exec(ctx, `
		INSERT INTO deal_rooms (
			id, external_id, nexconn_channel_id, channel_type, title,
			buyer_user_id, seller_user_id, arbitrator_user_id,
			story_stage, is_frozen, deal_meta, created_at, updated_at
		) VALUES ($1::uuid, $2, $3, 'GROUP', $4, $5::uuid, $6::uuid, $7::uuid, $8, $9, $10::jsonb, $11, $12)
		ON CONFLICT (id) DO UPDATE SET
			title = EXCLUDED.title,
			arbitrator_user_id = EXCLUDED.arbitrator_user_id,
			story_stage = EXCLUDED.story_stage,
			is_frozen = EXCLUDED.is_frozen,
			deal_meta = EXCLUDED.deal_meta,
			updated_at = EXCLUDED.updated_at`,
		dealUUID, d.ID, d.ChannelID, d.Title,
		UserUUID(d.BuyerID), UserUUID(d.SellerID), arbUUID,
		fsm.StoryStage(st), d.IsFrozen, string(marshalJSONOrEmptyObj(meta)), d.CreatedAt, d.UpdatedAt,
	)
	if err != nil {
		slog.Error("PostgresStore.PutDeal insert deal_rooms failed", "deal_id", d.ID, "err", err)
		return
	}

	_, err = tx.Exec(ctx, `
		INSERT INTO escrow_contracts (
			id, deal_room_id, fsm_state, amount_paise, currency,
			checklist_items, upi_mandate_umn, version, updated_at
		) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6::jsonb, $7, $8, $9)
		ON CONFLICT (deal_room_id) DO NOTHING`,
		escrowUUID, dealUUID, string(st), d.AmountPaise, curr,
		string(marshalJSONOrEmptyArr(d.Checklist)), umn, int(ver), d.UpdatedAt,
	)
	if err != nil {
		slog.Error("PostgresStore.PutDeal insert escrow_contracts failed", "deal_id", d.ID, "err", err)
		return
	}

	for _, m := range d.Messages {
		if err := insertMessageTx(ctx, tx, dealUUID, m); err != nil {
			slog.Error("PostgresStore.PutDeal insert message failed", "deal_id", d.ID, "err", err)
			return
		}
	}
	for _, a := range d.AssayLogs {
		if err := insertAssayTx(ctx, tx, dealUUID, a); err != nil {
			slog.Error("PostgresStore.PutDeal insert assay failed", "deal_id", d.ID, "err", err)
			return
		}
	}
	for _, v := range d.Vouchers {
		if err := insertVoucherTx(ctx, tx, dealUUID, v); err != nil {
			slog.Error("PostgresStore.PutDeal insert voucher failed", "deal_id", d.ID, "err", err)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		slog.Error("PostgresStore.PutDeal commit failed", "deal_id", d.ID, "err", err)
		return
	}

	p.mu.Lock()
	if _, exists := p.deals[d.ID]; !exists {
		p.dealOrder = append(p.dealOrder, d.ID)
	}
	p.deals[d.ID] = d
	p.mu.Unlock()
}

func (p *PostgresStore) GetDeal(id string) (*Deal, bool) {
	ctx, cancel := p.opCtx()
	defer cancel()

	loaded, ok := p.fetchDealFromDB(ctx, id)
	if !ok {
		return nil, false
	}
	// Ensure buyer & seller users are cached in memory for UserCopyUnsafe inside ReadDeal.
	_, _ = p.GetUser(loaded.BuyerID)
	_, _ = p.GetUser(loaded.SellerID)
	if loaded.DisputeID != "" {
		_, _ = p.GetDispute(loaded.DisputeID)
	}

	p.mu.Lock()
	defer p.mu.Unlock()
	if existing, exists := p.deals[loaded.ID]; exists {
		mergeDealIntoSingleton(existing, loaded)
		return existing, true
	}
	p.dealOrder = append(p.dealOrder, loaded.ID)
	p.deals[loaded.ID] = loaded
	return loaded, true
}

func (p *PostgresStore) ReadDeal(d *Deal, fn func(*Deal)) {
	p.mu.RLock()
	defer p.mu.RUnlock()
	fn(d)
}

func (p *PostgresStore) UpdateDeal(d *Deal, fn func(*Deal)) {
	p.mu.Lock()
	prevMsgs := len(d.Messages)
	prevAssays := len(d.AssayLogs)
	prevVouchers := len(d.Vouchers)

	fn(d)
	d.UpdatedAt = time.Now().UTC()

	newMsgs := append([]ChatMessage(nil), d.Messages[prevMsgs:]...)
	newAssays := append([]AssayLog(nil), d.AssayLogs[prevAssays:]...)
	newVouchers := append([]Voucher(nil), d.Vouchers[prevVouchers:]...)
	checklistCopy := append([]ChecklistItem(nil), d.Checklist...)
	meta := dealMetaJSON{
		RequiredSerial: d.RequiredSerial,
		MinMotorRPM:    d.MinMotorRPM,
		ReferencePHash: d.ReferencePHash,
		DisputeID:      d.DisputeID,
	}
	if d.Challenge != nil {
		c := *d.Challenge
		meta.Challenge = &c
	}
	arbID := d.ArbitratorID
	isFrozen := d.IsFrozen
	umn := d.UPIMandateUMN
	updatedAt := d.UpdatedAt
	dealID := d.ID
	p.mu.Unlock()

	ctx, cancel := p.opCtx()
	defer cancel()
	tx, err := p.pool.Begin(ctx)
	if err != nil {
		slog.Error("PostgresStore.UpdateDeal begin tx failed", "deal_id", dealID, "err", err)
		return
	}
	defer func() { _ = tx.Rollback(ctx) }()

	dealUUID := DealUUID(dealID)
	var arbUUID *string
	if arbID != "" {
		a := UserUUID(arbID)
		arbUUID = &a
	}
	var umnPtr *string
	if umn != "" {
		umnPtr = &umn
	}

	_, err = tx.Exec(ctx, `
		UPDATE deal_rooms
		SET arbitrator_user_id = $1::uuid, is_frozen = $2, deal_meta = $3::jsonb, updated_at = $4
		WHERE id = $5::uuid`,
		arbUUID, isFrozen, string(marshalJSONOrEmptyObj(meta)), updatedAt, dealUUID,
	)
	if err != nil {
		slog.Error("PostgresStore.UpdateDeal update deal_rooms failed", "deal_id", dealID, "err", err)
		return
	}

	_, err = tx.Exec(ctx, `
		UPDATE escrow_contracts
		SET checklist_items = $1::jsonb, upi_mandate_umn = $2, updated_at = $3
		WHERE deal_room_id = $4::uuid`,
		string(marshalJSONOrEmptyArr(checklistCopy)), umnPtr, updatedAt, dealUUID,
	)
	if err != nil {
		slog.Error("PostgresStore.UpdateDeal update escrow_contracts failed", "deal_id", dealID, "err", err)
		return
	}

	for _, m := range newMsgs {
		if err := insertMessageTx(ctx, tx, dealUUID, m); err != nil {
			slog.Error("PostgresStore.UpdateDeal insert message failed", "deal_id", dealID, "err", err)
			return
		}
	}
	for _, a := range newAssays {
		if err := insertAssayTx(ctx, tx, dealUUID, a); err != nil {
			slog.Error("PostgresStore.UpdateDeal insert assay failed", "deal_id", dealID, "err", err)
			return
		}
	}
	for _, v := range newVouchers {
		if err := insertVoucherTx(ctx, tx, dealUUID, v); err != nil {
			slog.Error("PostgresStore.UpdateDeal insert voucher failed", "deal_id", dealID, "err", err)
			return
		}
	}

	if err := tx.Commit(ctx); err != nil {
		slog.Error("PostgresStore.UpdateDeal commit failed", "deal_id", dealID, "err", err)
	}
}

func (p *PostgresStore) ListDeals() []*Deal {
	ctx, cancel := p.opCtx()
	defer cancel()

	rows, err := p.pool.Query(ctx, `
		SELECT COALESCE(external_id, id::text)
		FROM deal_rooms
		ORDER BY created_at DESC`)
	if err != nil {
		p.mu.RLock()
		defer p.mu.RUnlock()
		out := make([]*Deal, 0, len(p.dealOrder))
		for i := len(p.dealOrder) - 1; i >= 0; i-- {
			out = append(out, p.deals[p.dealOrder[i]])
		}
		return out
	}
	var ids []string
	for rows.Next() {
		var extID string
		if err := rows.Scan(&extID); err == nil && extID != "" {
			ids = append(ids, extID)
		}
	}
	rows.Close()

	out := make([]*Deal, 0, len(ids))
	for _, id := range ids {
		if d, ok := p.GetDeal(id); ok {
			out = append(out, d)
		}
	}
	return out
}

// ApplyTransition executes an ACID PostgreSQL transaction with optimistic version CAS on escrow_contracts
// ("WHERE deal_room_id = $2 AND version = $3") and appends the Ed25519 voucher to system_audit_vouchers.
func (p *PostgresStore) ApplyTransition(ctx context.Context, d *Deal, act fsm.Action, expectedVersion int64, mint VoucherMintFunc) (fsm.Result, Voucher, ChatMessage, error) {
	if !fsm.IsValidAction(act) {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fsm.ErrUnknownAction
	}

	start := hrtime.Now()
	txCtx, cancel := context.WithTimeout(ctx, 8*time.Second)
	defer cancel()

	tx, err := p.pool.Begin(txCtx)
	if err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("begin transition tx: %w", err)
	}
	defer func() { _ = tx.Rollback(txCtx) }()

	dealUUID := DealUUID(d.ID)
	var currStateStr string
	var currVersion int64
	var amountPaise int64
	err = tx.QueryRow(txCtx, `
		SELECT fsm_state, version, amount_paise
		FROM escrow_contracts
		WHERE deal_room_id = $1::uuid`, dealUUID,
	).Scan(&currStateStr, &currVersion, &amountPaise)
	if err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("load escrow_contracts for %s: %w", d.ID, err)
	}

	currState := fsm.State(currStateStr)
	if expectedVersion >= 0 && expectedVersion != currVersion {
		d.Machine.Sync(currState, currVersion)
		return fsm.Result{}, Voucher{}, ChatMessage{}, &fsm.ConflictError{
			ExpectedVersion: expectedVersion,
			ActualVersion:   currVersion,
			ActualState:     currState,
		}
	}
	targetExpected := currVersion
	if expectedVersion >= 0 {
		targetExpected = expectedVersion
	}

	nextState, err := fsm.NextState(currState, act)
	if err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, err
	}

	// Optimistic Concurrency Control CAS update on escrow_contracts.
	var newVersion int64
	casStart := hrtime.Now()
	err = tx.QueryRow(txCtx, `
		UPDATE escrow_contracts
		SET fsm_state = $1, version = version + 1, updated_at = NOW()
		WHERE deal_room_id = $2::uuid AND version = $3
		RETURNING version`,
		string(nextState), dealUUID, targetExpected,
	).Scan(&newVersion)
	casExec := hrtime.Since(casStart)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// Concurrent writer won the race; fetch actual version/state for accurate 409 payload.
			var actualState string
			var actualVer int64
			_ = p.pool.QueryRow(txCtx, `SELECT fsm_state, version FROM escrow_contracts WHERE deal_room_id = $1::uuid`, dealUUID).Scan(&actualState, &actualVer)
			d.Machine.Sync(fsm.State(actualState), actualVer)
			return fsm.Result{}, Voucher{}, ChatMessage{}, &fsm.ConflictError{
				ExpectedVersion: targetExpected,
				ActualVersion:   actualVer,
				ActualState:     fsm.State(actualState),
			}
		}
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("optimistic lock update: %w", err)
	}

	now := time.Now().UTC()
	_, err = tx.Exec(txCtx, `
		UPDATE deal_rooms
		SET story_stage = $1, updated_at = $2
		WHERE id = $3::uuid`,
		fsm.StoryStage(nextState), now, dealUUID,
	)
	if err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("update deal_rooms story_stage: %w", err)
	}

	// Fetch chain head from append-only system_audit_vouchers inside the same transaction.
	var prevHash string
	err = tx.QueryRow(txCtx, `
		SELECT TRIM(curr_voucher_sha256)
		FROM system_audit_vouchers
		WHERE deal_room_id = $1::uuid
		ORDER BY seq DESC, created_at DESC
		LIMIT 1`, dealUUID,
	).Scan(&prevHash)
	if errors.Is(err, pgx.ErrNoRows) {
		prevHash = ""
	} else if err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("read voucher head: %w", err)
	}

	_ = start
	res := fsm.Result{
		Prev:     currState,
		Next:     nextState,
		Version:  newVersion,
		ExecTime: casExec,
	}

	v, card, err := mint(prevHash, res, amountPaise)
	if err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, err
	}

	if err := insertVoucherTx(txCtx, tx, dealUUID, v); err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("append system_audit_vouchers: %w", err)
	}
	if err := insertMessageTx(txCtx, tx, dealUUID, card); err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("append escrow card message: %w", err)
	}

	if err := tx.Commit(txCtx); err != nil {
		return fsm.Result{}, Voucher{}, ChatMessage{}, fmt.Errorf("commit transition tx: %w", err)
	}

	d.Machine.Sync(nextState, newVersion)
	p.mu.Lock()
	d.Vouchers = append(d.Vouchers, v)
	d.Messages = append(d.Messages, card)
	d.UpdatedAt = now
	p.mu.Unlock()

	return res, v, card, nil
}

// ---- Disputes (E-07) ----

func (p *PostgresStore) PutDispute(dp *Dispute) {
	p.upsertDisputeDB(dp)
	p.mu.Lock()
	p.disputes[dp.ID] = dp
	p.mu.Unlock()
}

func (p *PostgresStore) GetDispute(id string) (*Dispute, bool) {
	ctx, cancel := p.opCtx()
	defer cancel()
	loaded, ok := p.fetchDisputeFromDB(ctx, id)
	if !ok {
		p.mu.RLock()
		d, exists := p.disputes[id]
		p.mu.RUnlock()
		return d, exists
	}
	p.mu.Lock()
	if existing, exists := p.disputes[loaded.ID]; exists {
		*existing = *loaded
		p.mu.Unlock()
		return existing, true
	}
	p.disputes[loaded.ID] = loaded
	p.mu.Unlock()
	return loaded, true
}

func (p *PostgresStore) DisputeCopy(id string) (Dispute, bool) {
	if dp, ok := p.GetDispute(id); ok {
		p.mu.RLock()
		cp := *dp
		p.mu.RUnlock()
		return cp, true
	}
	return Dispute{}, false
}

func (p *PostgresStore) DisputeCopyUnsafe(id string) (Dispute, bool) {
	dp, ok := p.disputes[id]
	if !ok {
		return Dispute{}, false
	}
	return *dp, true
}

func (p *PostgresStore) UpdateDispute(dp *Dispute, fn func(*Dispute)) {
	p.mu.Lock()
	fn(dp)
	cp := *dp
	p.mu.Unlock()
	p.upsertDisputeDB(&cp)
}

func (p *PostgresStore) ListDisputes() []Dispute {
	ctx, cancel := p.opCtx()
	defer cancel()
	rows, err := p.pool.Query(ctx, `SELECT COALESCE(external_id, id::text) FROM dispute_cases`)
	if err == nil {
		var ids []string
		for rows.Next() {
			var id string
			if err := rows.Scan(&id); err == nil && id != "" {
				ids = append(ids, id)
			}
		}
		rows.Close()
		for _, id := range ids {
			_, _ = p.GetDispute(id)
		}
	}

	p.mu.RLock()
	out := make([]Dispute, 0, len(p.disputes))
	for _, d := range p.disputes {
		out = append(out, *d)
	}
	p.mu.RUnlock()
	sort.Slice(out, func(i, j int) bool {
		oi, oj := out[i].Status != "SETTLED_BINDING", out[j].Status != "SETTLED_BINDING"
		if oi != oj {
			return oi
		}
		return out[i].FrozenAt.After(out[j].FrozenAt)
	})
	return out
}

// ---- Bargain Arena (E-10) ----

func (p *PostgresStore) PutArena(r *ArenaRun) {
	p.mu.Lock()
	p.arena[r.ID] = r
	p.mu.Unlock()
	p.saveArenaDB(r)
}

func (p *PostgresStore) SaveArena(r *ArenaRun) {
	p.mu.Lock()
	p.arena[r.ID] = r
	p.mu.Unlock()
	p.saveArenaDB(r)
}

func (p *PostgresStore) GetArena(id string) (*ArenaRun, bool) {
	p.mu.RLock()
	existing, ok := p.arena[id]
	p.mu.RUnlock()
	if ok {
		return existing, true
	}
	ctx, cancel := p.opCtx()
	defer cancel()
	loaded, found := p.fetchArenaFromDB(ctx, id)
	if !found {
		return nil, false
	}
	p.mu.Lock()
	if cur, exists := p.arena[loaded.ID]; exists {
		p.mu.Unlock()
		return cur, true
	}
	p.arena[loaded.ID] = loaded
	p.mu.Unlock()
	return loaded, true
}

func (p *PostgresStore) ArenaCount() int {
	ctx, cancel := p.opCtx()
	defer cancel()
	var n int
	if err := p.pool.QueryRow(ctx, `SELECT COUNT(*) FROM bargain_arena_runs`).Scan(&n); err == nil {
		return n
	}
	p.mu.RLock()
	defer p.mu.RUnlock()
	return len(p.arena)
}

// ---- Marketplace & Community Subchannels (E-09) ----

func (p *PostgresStore) AddLot(l *OpenLot) {
	ctx, cancel := p.opCtx()
	defer cancel()

	seller, ok := p.GetUserByNexconn(l.SellerNexconnID)
	if !ok {
		seller = &User{
			ID: "e01_" + NewUUID(), NexconnUserID: l.SellerNexconnID, DisplayName: l.SellerNexconnID,
			Role: "seller", Locale: "hi-IN", KYCTier: "GUEST_SANDBOX", CreatedAt: time.Now().UTC(),
		}
		p.PutUser(seller)
	}
	_, err := p.pool.Exec(ctx, `
		INSERT INTO open_flash_lots (
			id, external_id, nexconn_open_channel_id, seller_user_id,
			title, ask_amount_paise, current_bid_paise, assay_verified,
			is_priority_whitelisted, expires_at
		) VALUES ($1::uuid, $2, $3, $4::uuid, $5, $6, $7, $8, TRUE, $9)
		ON CONFLICT (id) DO UPDATE SET
			current_bid_paise = EXCLUDED.current_bid_paise,
			assay_verified = EXCLUDED.assay_verified,
			expires_at = EXCLUDED.expires_at`,
		LotUUID(l.LotID), l.LotID, l.OpenChannelID, UserUUID(seller.ID),
		l.Title, l.ReservePricePaise, l.CurrentBidPaise, l.AssayVerified, l.EndsAt,
	)
	if err != nil {
		slog.Error("PostgresStore.AddLot failed", "lot_id", l.LotID, "err", err)
	}
}

func (p *PostgresStore) ActiveLots(now time.Time) []OpenLot {
	ctx, cancel := p.opCtx()
	defer cancel()
	rows, err := p.pool.Query(ctx, `
		SELECT COALESCE(l.external_id, l.id::text), l.nexconn_open_channel_id, l.title,
		       u.nexconn_user_id, l.ask_amount_paise, COALESCE(l.current_bid_paise, l.ask_amount_paise),
		       l.assay_verified, l.expires_at
		FROM open_flash_lots l
		JOIN users u ON u.id = l.seller_user_id
		WHERE l.expires_at > $1
		ORDER BY l.expires_at DESC`, now.UTC(),
	)
	if err != nil {
		return []OpenLot{}
	}
	defer rows.Close()
	out := []OpenLot{}
	for rows.Next() {
		var l OpenLot
		if err := rows.Scan(&l.LotID, &l.OpenChannelID, &l.Title, &l.SellerNexconnID, &l.ReservePricePaise, &l.CurrentBidPaise, &l.AssayVerified, &l.EndsAt); err == nil {
			out = append(out, l)
		}
	}
	return out
}

func (p *PostgresStore) OpenChannelCount() int {
	ctx, cancel := p.opCtx()
	defer cancel()
	var n int
	_ = p.pool.QueryRow(ctx, `SELECT COUNT(DISTINCT nexconn_open_channel_id) FROM open_flash_lots`).Scan(&n)
	return n
}

func (p *PostgresStore) Subchannels() []Subchannel {
	ctx, cancel := p.opCtx()
	defer cancel()
	rows, err := p.pool.Query(ctx, `
		SELECT subchannel_id, slug, title, active_members, community_channel_id
		FROM community_subchannels
		ORDER BY created_at ASC, subchannel_id ASC`,
	)
	if err != nil {
		return []Subchannel{}
	}
	defer rows.Close()
	out := []Subchannel{}
	for rows.Next() {
		var sc Subchannel
		if err := rows.Scan(&sc.SubchannelID, &sc.Slug, &sc.Title, &sc.ActiveMembers, &sc.CommunityChannelID); err == nil {
			out = append(out, sc)
		}
	}
	return out
}

func (p *PostgresStore) GetOrCreateSubchannel(slug string, mk func(n int) *Subchannel, join bool) (Subchannel, bool) {
	ctx, cancel := p.opCtx()
	defer cancel()

	inc := 0
	if join {
		inc = 1
	}
	var sc Subchannel
	err := p.pool.QueryRow(ctx, `
		UPDATE community_subchannels
		SET active_members = active_members + $1
		WHERE slug = $2
		RETURNING subchannel_id, slug, title, active_members, community_channel_id`,
		inc, slug,
	).Scan(&sc.SubchannelID, &sc.Slug, &sc.Title, &sc.ActiveMembers, &sc.CommunityChannelID)
	if err == nil {
		return sc, false
	}

	var count int
	_ = p.pool.QueryRow(ctx, `SELECT COUNT(*) FROM community_subchannels`).Scan(&count)
	created := mk(count + 1)
	if join {
		created.ActiveMembers++
	}
	err = p.pool.QueryRow(ctx, `
		INSERT INTO community_subchannels (subchannel_id, slug, title, active_members, community_channel_id)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (slug) DO UPDATE SET active_members = community_subchannels.active_members + $6
		RETURNING subchannel_id, slug, title, active_members, community_channel_id`,
		created.SubchannelID, created.Slug, created.Title, created.ActiveMembers, created.CommunityChannelID, inc,
	).Scan(&sc.SubchannelID, &sc.Slug, &sc.Title, &sc.ActiveMembers, &sc.CommunityChannelID)
	if err != nil {
		return *created, true
	}
	return sc, sc.SubchannelID == created.SubchannelID && sc.ActiveMembers == created.ActiveMembers
}

// ---- Webhooks & Counts (API-17, API-18) ----

func (p *PostgresStore) WebhookSeen(eventID string) ([]byte, bool) {
	ctx, cancel := p.opCtx()
	defer cancel()
	var raw []byte
	err := p.pool.QueryRow(ctx, `SELECT response_json::text FROM processed_webhook_events WHERE event_id = $1`, eventID).Scan(&raw)
	if err != nil {
		return nil, false
	}
	return raw, true
}

func (p *PostgresStore) RecordWebhook(eventID string, resp []byte) {
	ctx, cancel := p.opCtx()
	defer cancel()
	_, err := p.pool.Exec(ctx, `
		INSERT INTO processed_webhook_events (event_id, response_json)
		VALUES ($1, $2::jsonb)
		ON CONFLICT (event_id) DO NOTHING`,
		eventID, string(resp),
	)
	if err != nil {
		slog.Error("PostgresStore.RecordWebhook failed", "event_id", eventID, "err", err)
	}
}

func (p *PostgresStore) Counts() Counts {
	ctx, cancel := p.opCtx()
	defer cancel()
	var c Counts
	_ = p.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM deal_rooms),
			(SELECT COUNT(*) FROM system_audit_vouchers),
			(SELECT COUNT(*) FROM community_subchannels),
			(SELECT COUNT(*) FROM bargain_arena_runs),
			(SELECT COUNT(DISTINCT nexconn_open_channel_id) FROM open_flash_lots),
			(SELECT COUNT(*) FROM dispute_cases)`,
	).Scan(&c.Users, &c.Deals, &c.Vouchers, &c.Subchannels, &c.ArenaRuns, &c.OpenChannels, &c.Disputes)
	return c
}

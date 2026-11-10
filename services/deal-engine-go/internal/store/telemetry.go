package store

import (
	"sort"
	"sync"
	"time"
)

// ring is a fixed-size latency sample buffer.
type ring struct {
	buf  []float64
	next int
	full bool
}

func newRing(n int) *ring { return &ring{buf: make([]float64, n)} }

func (r *ring) add(v float64) {
	r.buf[r.next] = v
	r.next = (r.next + 1) % len(r.buf)
	if r.next == 0 {
		r.full = true
	}
}

func (r *ring) values() []float64 {
	n := r.next
	if r.full {
		n = len(r.buf)
	}
	out := append([]float64(nil), r.buf[:n]...)
	return out
}

// Percentile returns the nearest-rank percentile of vals (0 if empty).
func Percentile(vals []float64, p float64) float64 {
	if len(vals) == 0 {
		return 0
	}
	s := append([]float64(nil), vals...)
	sort.Float64s(s)
	idx := int(p/100*float64(len(s))+0.999999) - 1
	idx = max(0, min(len(s)-1, idx))
	return s[idx]
}

// Baseline is the clearly-labelled seeded demo baseline (NOT real users).
type Baseline struct {
	VerifiedConnectedMAUs int            `json:"verified_connected_maus"`
	ChannelsByType        map[string]int `json:"active_channels_by_type"`
	VouchersSigned        int            `json:"total_escrow_vouchers_signed"`
}

// DefaultBaseline is a modest seeded baseline so /traction isn't empty.
func DefaultBaseline() Baseline {
	return Baseline{
		VerifiedConnectedMAUs: 37,
		ChannelsByType:        map[string]int{"direct": 12, "group": 8, "community": 0, "open": 0, "system": 1},
		VouchersSigned:        46,
	}
}

// Telemetry collects live counters and latency samples.
type Telemetry struct {
	mu          sync.Mutex
	StartedAt   time.Time
	Baseline    Baseline
	fsmNs       *ring
	piiUs       *ring
	assayMs     *ring
	piiEngine   string
	assayEngine string
	tokensLive  int
	tokensSim   int
	tokenUsers  map[string]bool
	transitions int
	webhooksOK  int
	webhooksBad int
}

// NewTelemetry creates the collector.
func NewTelemetry() *Telemetry {
	return &Telemetry{
		StartedAt: time.Now().UTC(), Baseline: DefaultBaseline(),
		fsmNs: newRing(4096), piiUs: newRing(2048), assayMs: newRing(1024), tokenUsers: map[string]bool{},
	}
}

// RecordFSM records one FSM transition execution time.
func (t *Telemetry) RecordFSM(d time.Duration) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.fsmNs.add(float64(d.Nanoseconds()))
	t.transitions++
}

// RecordPII records a PII scrub time in µs.
func (t *Telemetry) RecordPII(us int64, engine string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.piiUs.add(float64(us))
	t.piiEngine = engine
}

// RecordAssay records an assay compute time in ms.
func (t *Telemetry) RecordAssay(ms float64, engine string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.assayMs.add(ms)
	t.assayEngine = engine
}

// RecordToken records a Nexconn token issuance.
func (t *Telemetry) RecordToken(nexconnUserID, mode string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if mode == "live" {
		t.tokensLive++
	} else {
		t.tokensSim++
	}
	t.tokenUsers[nexconnUserID] = true
}

// RecordWebhook counts webhook verifications.
func (t *Telemetry) RecordWebhook(ok bool) {
	t.mu.Lock()
	defer t.mu.Unlock()
	if ok {
		t.webhooksOK++
	} else {
		t.webhooksBad++
	}
}

// Snapshot is a read-only view of telemetry.
type Snapshot struct {
	FSMP99Ms, FSMP50Ms      float64
	FSMSamples              int
	PIIP99Ms                float64
	PIISamples              int
	PIIEngine               string
	AssayP99Ms              float64
	AssaySamples            int
	AssayEngine             string
	TokensLive, TokensSim   int
	DistinctTokenUsers      int
	Transitions             int
	WebhooksOK, WebhooksBad int
	Uptime                  time.Duration
}

// Snapshot computes percentiles.
func (t *Telemetry) Snapshot() Snapshot {
	t.mu.Lock()
	defer t.mu.Unlock()
	f := t.fsmNs.values()
	p := t.piiUs.values()
	a := t.assayMs.values()
	return Snapshot{
		FSMP99Ms: Percentile(f, 99) / 1e6, FSMP50Ms: Percentile(f, 50) / 1e6, FSMSamples: len(f),
		PIIP99Ms: Percentile(p, 99) / 1e3, PIISamples: len(p), PIIEngine: t.piiEngine,
		AssayP99Ms: Percentile(a, 99), AssaySamples: len(a), AssayEngine: t.assayEngine,
		TokensLive: t.tokensLive, TokensSim: t.tokensSim, DistinctTokenUsers: len(t.tokenUsers),
		Transitions: t.transitions, WebhooksOK: t.webhooksOK, WebhooksBad: t.webhooksBad,
		Uptime: time.Since(t.StartedAt),
	}
}

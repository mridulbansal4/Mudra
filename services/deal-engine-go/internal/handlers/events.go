package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	mw "github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/middleware"
)

type sseEvent struct {
	name string
	data []byte
}

type subscriber struct {
	ch chan sseEvent
}

// Broadcaster fans out per-deal SSE events.
type Broadcaster struct {
	mu     sync.Mutex
	subs   map[string]map[*subscriber]struct{}
	closed bool
	done   chan struct{}
}

// NewBroadcaster creates a broadcaster.
func NewBroadcaster() *Broadcaster {
	return &Broadcaster{subs: map[string]map[*subscriber]struct{}{}, done: make(chan struct{})}
}

func (b *Broadcaster) subscribe(dealID string) *subscriber {
	b.mu.Lock()
	defer b.mu.Unlock()
	s := &subscriber{ch: make(chan sseEvent, 64)}
	if b.subs[dealID] == nil {
		b.subs[dealID] = map[*subscriber]struct{}{}
	}
	b.subs[dealID][s] = struct{}{}
	return s
}

func (b *Broadcaster) unsubscribe(dealID string, s *subscriber) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.subs[dealID], s)
	if len(b.subs[dealID]) == 0 {
		delete(b.subs, dealID)
	}
}

// HasSubscribers reports whether anyone listens to dealID.
func (b *Broadcaster) HasSubscribers(dealID string) bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.subs[dealID]) > 0
}

// SubscriberCount returns total open SSE streams.
func (b *Broadcaster) SubscriberCount() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	n := 0
	for _, m := range b.subs {
		n += len(m)
	}
	return n
}

func (b *Broadcaster) publish(dealID, name string, v any) {
	data, err := json.Marshal(v)
	if err != nil {
		return
	}
	b.mu.Lock()
	defer b.mu.Unlock()
	for s := range b.subs[dealID] {
		select {
		case s.ch <- sseEvent{name: name, data: data}:
		default: // slow consumer: drop (the next `deal` event carries full state)
		}
	}
}

// PublishDeal sends `event: deal`.
func (b *Broadcaster) PublishDeal(dealID string, v DealView) { b.publish(dealID, "deal", v) }

// PublishMessage sends `event: message`.
func (b *Broadcaster) PublishMessage(dealID string, m any) { b.publish(dealID, "message", m) }

// Close terminates all streams (called on server shutdown).
func (b *Broadcaster) Close() {
	b.mu.Lock()
	defer b.mu.Unlock()
	if !b.closed {
		b.closed = true
		close(b.done)
	}
}

const ssePing = 15 * time.Second

// handleDealEvents: GET /api/v1/deals/{dealId}/events (text/event-stream).
// Auth via Bearer header or ?access_token= (EventSource can't send headers).
func (s *Server) handleDealEvents(w http.ResponseWriter, r *http.Request) {
	d, ok := s.loadDeal(w, r)
	if !ok {
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		mw.WriteError(w, r, http.StatusInternalServerError, "ERR_INTERNAL", "streaming unsupported", false)
		return
	}
	_ = http.NewResponseController(w).SetWriteDeadline(time.Time{})
	h := w.Header()
	h.Set("Content-Type", "text/event-stream")
	h.Set("Cache-Control", "no-cache")
	h.Set("Connection", "keep-alive")
	h.Set("X-Accel-Buffering", "no")
	w.WriteHeader(http.StatusOK)

	sub := s.Bus.subscribe(d.ID)
	defer s.Bus.unsubscribe(d.ID, sub)

	write := func(name string, data []byte) bool {
		if _, err := fmt.Fprintf(w, "event: %s\ndata: %s\n\n", name, data); err != nil {
			return false
		}
		flusher.Flush()
		return true
	}
	fmt.Fprint(w, "retry: 3000\n\n")
	initial, _ := json.Marshal(s.dealView(d))
	if !write("deal", initial) {
		return
	}
	ping := time.NewTicker(ssePing)
	defer ping.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case <-s.Bus.done:
			return
		case ev := <-sub.ch:
			if !write(ev.name, ev.data) {
				return
			}
		case <-ping.C:
			if _, err := fmt.Fprint(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}

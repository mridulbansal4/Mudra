package clients

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"
)

// Bridge is the client for services/nexconn-bridge-node (:4001) with simulated fallbacks.
type Bridge struct {
	svc    *service
	appKey string
}

// NewBridge builds the client. appKey is only used to label simulated tokens.
func NewBridge(baseURL, hmacSecret, appKey string) *Bridge {
	return &Bridge{svc: newService("nexconn-bridge-node", baseURL, hmacSecret), appKey: appKey}
}

// RunProber keeps reachability fresh.
func (b *Bridge) RunProber(ctx context.Context) { b.svc.runProber(ctx, 5*time.Second) }

// Status for /health.
func (b *Bridge) Status() Status { return b.svc.status() }

// Reachable reports last known reachability.
func (b *Bridge) Reachable() bool { return b.svc.isReachable() }

func randHex(n int) string {
	buf := make([]byte, n)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}

func engineFromMode(mode string) string {
	if mode == "live" {
		return EngineBridgeLive
	}
	return EngineBridgeSimulated
}

// TokenResult mirrors /internal/nc/token.
type TokenResult struct {
	AccessToken  string `json:"access_token"`
	AppKey       string `json:"app_key"`
	ExpiresInSec int64  `json:"expires_in_sec"`
	Mode         string `json:"mode"`
	Engine       string `json:"engine"`
}

// IssueToken issues a Nexconn access token (sim_ token when bridge is down).
func (b *Bridge) IssueToken(ctx context.Context, userID, name, avatar string) TokenResult {
	var out TokenResult
	req := map[string]any{"user_id": userID, "name": name}
	if avatar != "" {
		req["avatar_url"] = avatar
	}
	if err := b.svc.postJSON(ctx, "/internal/nc/token", req, &out); err == nil && out.AccessToken != "" {
		out.Engine = engineFromMode(out.Mode)
		return out
	}
	appKey := "sim_app_key_offline"
	return TokenResult{
		AccessToken:  fmt.Sprintf("sim_%s_%s", userID, randHex(12)),
		AppKey:       appKey,
		ExpiresInSec: 86400,
		Mode:         "simulated",
		Engine:       EngineGoFallback,
	}
}

// CallResult is a generic bridge result for fire-and-report calls.
type CallResult struct {
	OK     bool           `json:"ok"`
	Mode   string         `json:"mode"`
	Engine string         `json:"engine"`
	Raw    map[string]any `json:"-"`
}

func (b *Bridge) call(ctx context.Context, path string, req any) CallResult {
	var raw map[string]any
	if err := b.svc.postJSON(ctx, path, req, &raw); err != nil {
		return CallResult{OK: false, Mode: "simulated", Engine: EngineGoFallback}
	}
	mode, _ := raw["mode"].(string)
	return CallResult{OK: true, Mode: mode, Engine: engineFromMode(mode), Raw: raw}
}

// CreateGroupChannel provisions the deal's group channel.
func (b *Bridge) CreateGroupChannel(ctx context.Context, channelID, name, owner string, userIDs []string) CallResult {
	return b.call(ctx, "/internal/nc/channel/create", map[string]any{"channel_id": channelID, "name": name, "owner": owner, "user_ids": userIDs})
}

// StreamResult carries a stream id.
type StreamResult struct {
	StreamID string `json:"stream_id"`
	Mode     string `json:"mode"`
	Engine   string `json:"engine"`
}

func (b *Bridge) stream(ctx context.Context, path string, req map[string]any, simPrefix string) StreamResult {
	var out StreamResult
	if err := b.svc.postJSON(ctx, path, req, &out); err == nil && out.StreamID != "" {
		out.Engine = engineFromMode(out.Mode)
		return out
	}
	return StreamResult{StreamID: simPrefix + randHex(5), Mode: "simulated", Engine: EngineGoFallback}
}

// StreamGroup sends a stream message to a group channel.
func (b *Bridge) StreamGroup(ctx context.Context, channelID, fromUserID, messageType, text string, extras map[string]any) StreamResult {
	if extras == nil {
		extras = map[string]any{}
	}
	return b.stream(ctx, "/internal/nc/stream/group", map[string]any{
		"channel_id": channelID, "from_user_id": fromUserID, "message_type": messageType, "text": text, "extras": extras,
	}, "sim_nc_stream_")
}

// StreamDirect sends a stream message to a direct channel.
func (b *Bridge) StreamDirect(ctx context.Context, fromUserID, toUserID, messageType, text string, extras map[string]any) StreamResult {
	if extras == nil {
		extras = map[string]any{}
	}
	return b.stream(ctx, "/internal/nc/stream/direct", map[string]any{
		"from_user_id": fromUserID, "to_user_id": toUserID, "message_type": messageType, "text": text, "extras": extras,
	}, "sim_nc_dir_stream_")
}

// FreezeResult mirrors /internal/nc/moderation/freeze.
type FreezeResult struct {
	Frozen           bool   `json:"frozen"`
	LatencyMs        int64  `json:"latency_ms"`
	NexconnAPICalled string `json:"nexconn_api_called"`
	Mode             string `json:"mode"`
	Engine           string `json:"engine"`
}

// Freeze adds/removes the channel from the freeze list.
func (b *Bridge) Freeze(ctx context.Context, channelID string, freeze bool) FreezeResult {
	action, api := "remove", "POST /v4/group-channel/moderation/freeze/remove"
	if freeze {
		action, api = "add", "POST /v4/group-channel/moderation/freeze/add"
	}
	start := time.Now()
	var raw map[string]any
	err := b.svc.postJSON(ctx, "/internal/nc/moderation/freeze", map[string]any{"channel_id": channelID, "action": action}, &raw)
	if err != nil {
		return FreezeResult{Frozen: freeze, LatencyMs: time.Since(start).Milliseconds(), NexconnAPICalled: api + " (simulated: bridge offline)", Mode: "simulated", Engine: EngineGoFallback}
	}
	out := FreezeResult{Frozen: freeze, NexconnAPICalled: api}
	if v, ok := raw["frozen"].(bool); ok {
		out.Frozen = v
	}
	if v, ok := raw["latency_ms"].(float64); ok {
		out.LatencyMs = int64(v)
	} else {
		out.LatencyMs = time.Since(start).Milliseconds()
	}
	out.Mode, _ = raw["mode"].(string)
	switch v := raw["nexconn_api_called"].(type) {
	case string:
		if v != "" {
			out.NexconnAPICalled = v
		}
	case bool:
		if !v {
			out.NexconnAPICalled = api + " (simulated)"
		}
	}
	out.Engine = engineFromMode(out.Mode)
	return out
}

// CreateOpenChannel creates an Open channel.
func (b *Bridge) CreateOpenChannel(ctx context.Context, channelID string) CallResult {
	return b.call(ctx, "/internal/nc/open/create", map[string]any{"channel_id": channelID})
}

// PriorityBroadcast whitelists priority senders on an Open channel.
func (b *Bridge) PriorityBroadcast(ctx context.Context, channelID string, participantIDs []string) CallResult {
	return b.call(ctx, "/internal/nc/open/priority-broadcast", map[string]any{"channel_id": channelID, "participant_ids": participantIDs})
}

// CommunitySubchannel creates a community subchannel.
func (b *Bridge) CommunitySubchannel(ctx context.Context, channelID, subchannelID string) CallResult {
	return b.call(ctx, "/internal/nc/community/subchannel", map[string]any{"channel_id": channelID, "subchannel_id": subchannelID})
}

// SystemVoucher pushes a voucher into users' System channels.
func (b *Bridge) SystemVoucher(ctx context.Context, toUserIDs []string, payload map[string]any) CallResult {
	return b.call(ctx, "/internal/nc/system/voucher", map[string]any{"to_user_ids": toUserIDs, "payload": payload})
}

// TranslateResult mirrors /internal/ai/translate.
type TranslateResult struct {
	TranslatedText   string         `json:"translated_text"`
	ExtractedTerms   ExtractedTerms `json:"extracted_terms"`
	PIIRedactedCount int            `json:"pii_redacted_count"`
	Model            string         `json:"model"`
	Mode             string         `json:"mode"`
	Engine           string         `json:"engine"`
}

// Translate translates via the bridge or degrades to Go scrub + term extraction.
func (b *Bridge) Translate(ctx context.Context, text, src, dst string) TranslateResult {
	var out TranslateResult
	if err := b.svc.postJSON(ctx, "/internal/ai/translate", map[string]any{"text": text, "source_locale": src, "target_locale": dst}, &out); err == nil && out.TranslatedText != "" {
		out.Engine = engineFromMode(out.Mode)
		return out
	}
	tt, terms, n := TranslateGo(text, src, dst)
	return TranslateResult{TranslatedText: tt, ExtractedTerms: terms, PIIRedactedCount: n, Model: "go-passthrough-no-mt", Mode: "simulated", Engine: EngineGoFallback}
}

// Tribunal asks the bridge AI for a split recommendation (deterministic Go fallback).
func (b *Bridge) Tribunal(ctx context.Context, in TribunalInput) TribunalResult {
	var out TribunalResult
	if err := b.svc.postJSONWithin(ctx, SlowAITimeout, "/internal/ai/tribunal", in, &out); err == nil && out.BuyerRefundBps+out.SellerPayoutBps == 10000 {
		out.Engine = EngineBridgeLive
		if out.Model == "" || strings.HasPrefix(out.Model, "heuristic") {
			out.Engine = EngineBridgeSimulated
		}
		return out
	}
	return TribunalGo(in)
}

// Shopkeeper asks the bridge AI to phrase the arena reply (template fallback).
func (b *Bridge) Shopkeeper(ctx context.Context, in ShopkeeperInput) (string, string, string) {
	var out struct {
		ReplyText string `json:"reply_text"`
		Model     string `json:"model"`
	}
	if err := b.svc.postJSON(ctx, "/internal/ai/shopkeeper", in, &out); err == nil && out.ReplyText != "" {
		return out.ReplyText, out.Model, EngineBridgeLive
	}
	return ShopkeeperGo(in), "go-template-shopkeeper-v1", EngineGoFallback
}

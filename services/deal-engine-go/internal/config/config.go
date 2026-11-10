// Package config loads deal-engine configuration from the environment,
// optionally seeded from a repo-root `.env` file (tiny parser, no deps).
package config

import (
	"bufio"
	"encoding/hex"
	"log/slog"
	"os"
	"path/filepath"
	"strconv"
	"strings"
)

// Dev defaults mirror the repo's .env.example so the demo runs with zero setup.
const (
	DevJWTSecret      = "dev_samadhan_jwt_secret_change_in_prod"
	DevWebhookSecret  = "whsec_dev_upi_setu_razorpayx_hmac_secret_32b"
	DevEd25519SeedHex = "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20"
)

// Config is the runtime configuration.
type Config struct {
	Port               int
	BridgeURL          string
	RustURL            string
	InternalHMAC       string
	WebhookSecret      string
	JWTSecret          string
	Ed25519Seed        []byte
	NexconnAppKey      string
	CORSOrigins        []string
	DotEnvPath         string
	UsingDevJWT        bool
	UsingDevWebhook    bool
	UsingDevSigningKey bool
}

// Load reads configuration. It loads `.env` (if found) without overriding
// variables already present in the process environment.
func Load() Config {
	envPath := loadDotEnv()
	c := Config{
		Port:          atoiDefault(os.Getenv("GO_DEAL_ENGINE_PORT"), 4002),
		BridgeURL:     strings.TrimRight(getDefault("NEXCONN_BRIDGE_URL", "http://127.0.0.1:4001"), "/"),
		RustURL:       strings.TrimRight(getDefault("RUST_ASSAY_VERIFIER_URL", "http://127.0.0.1:4003"), "/"),
		InternalHMAC:  os.Getenv("INTERNAL_SERVICE_HMAC_SECRET"),
		WebhookSecret: os.Getenv("UPI_WEBHOOK_HMAC_SECRET"),
		JWTSecret:     os.Getenv("SAMADHAN_JWT_SECRET"),
		NexconnAppKey: os.Getenv("NEXCONN_APP_KEY"),
		DotEnvPath:    envPath,
		CORSOrigins:   []string{"http://localhost:5173", "http://127.0.0.1:5173"},
	}
	if extra := os.Getenv("CORS_ALLOWED_ORIGINS"); extra != "" {
		for _, o := range strings.Split(extra, ",") {
			if o = strings.TrimSpace(o); o != "" {
				c.CORSOrigins = append(c.CORSOrigins, o)
			}
		}
	}
	if c.JWTSecret == "" {
		c.JWTSecret, c.UsingDevJWT = DevJWTSecret, true
	}
	if c.WebhookSecret == "" {
		c.WebhookSecret, c.UsingDevWebhook = DevWebhookSecret, true
	}
	seedHex := strings.TrimSpace(os.Getenv("ASSAY_ED25519_PRIVATE_KEY_HEX"))
	seed, err := hex.DecodeString(seedHex)
	if seedHex == "" || err != nil || len(seed) != 32 {
		if seedHex != "" {
			slog.Warn("ASSAY_ED25519_PRIVATE_KEY_HEX invalid (need 64 hex chars); using dev seed")
		}
		seed, _ = hex.DecodeString(DevEd25519SeedHex)
		c.UsingDevSigningKey = true
	}
	c.Ed25519Seed = seed
	return c
}

func getDefault(k, d string) string {
	if v := strings.TrimSpace(os.Getenv(k)); v != "" {
		return v
	}
	return d
}

func atoiDefault(s string, d int) int {
	if n, err := strconv.Atoi(strings.TrimSpace(s)); err == nil && n > 0 {
		return n
	}
	return d
}

// loadDotEnv looks for .env in cwd and up to three parent dirs (the service is
// normally run from services/deal-engine-go, so ../../.env is the repo root).
func loadDotEnv() string {
	dir, err := os.Getwd()
	if err != nil {
		return ""
	}
	for i := 0; i < 4; i++ {
		p := filepath.Join(dir, ".env")
		if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
			if err := ParseDotEnvFile(p, false); err == nil {
				return p
			}
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return ""
}

// ParseDotEnvFile sets KEY=VALUE pairs from path. Existing env vars win unless override.
func ParseDotEnvFile(path string, override bool) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		k, v, ok := ParseDotEnvLine(sc.Text())
		if !ok {
			continue
		}
		if _, exists := os.LookupEnv(k); exists && !override {
			continue
		}
		_ = os.Setenv(k, v)
	}
	return sc.Err()
}

// ParseDotEnvLine parses one line: supports comments, `export `, single/double quotes
// and trailing ` # comment` on unquoted values.
func ParseDotEnvLine(line string) (string, string, bool) {
	line = strings.TrimSpace(line)
	if line == "" || strings.HasPrefix(line, "#") {
		return "", "", false
	}
	line = strings.TrimPrefix(line, "export ")
	eq := strings.IndexByte(line, '=')
	if eq <= 0 {
		return "", "", false
	}
	k := strings.TrimSpace(line[:eq])
	v := strings.TrimSpace(line[eq+1:])
	if len(v) >= 2 && (v[0] == '"' || v[0] == '\'') {
		q := v[0]
		if end := strings.IndexByte(v[1:], q); end >= 0 {
			v = v[1 : 1+end]
		}
	} else if i := strings.Index(v, " #"); i >= 0 {
		v = strings.TrimSpace(v[:i])
	}
	return k, v, true
}

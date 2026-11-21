// Command server runs the MUDRA-OS Go deal engine & public API gateway (:4002).
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/config"
	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/handlers"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})).With("service", "deal-engine-go"))

	cfg := config.Load()
	if cfg.DotEnvPath != "" {
		slog.Info("loaded .env", "path", cfg.DotEnvPath)
	}
	if cfg.UsingDevJWT || cfg.UsingDevWebhook || cfg.UsingDevSigningKey {
		slog.Warn("using development default secrets", "jwt", cfg.UsingDevJWT, "webhook", cfg.UsingDevWebhook, "ed25519_seed", cfg.UsingDevSigningKey)
	}

	srv := handlers.New(cfg)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	srv.StartBackground(ctx)

	host := os.Getenv("GO_DEAL_ENGINE_HOST")
	if host == "" {
		host = "0.0.0.0"
	}
	httpSrv := &http.Server{
		Addr:              host + ":" + strconv.Itoa(cfg.Port),
		Handler:           srv.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second, // SSE handler clears its own deadline
		IdleTimeout:       120 * time.Second,
	}
	httpSrv.RegisterOnShutdown(srv.Bus.Close)

	errCh := make(chan error, 1)
	go func() {
		slog.Info("deal-engine listening", "addr", httpSrv.Addr, "bridge", cfg.BridgeURL, "rust", cfg.RustURL, "cors", cfg.CORSOrigins)
		errCh <- httpSrv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed", "err", err)
			os.Exit(1)
		}
	case <-ctx.Done():
		slog.Info("shutdown signal received")
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "err", err)
		os.Exit(1)
	}
	if err := srv.Close(); err != nil {
		slog.Error("store close failed", "err", err)
		os.Exit(1)
	}
	slog.Info("shutdown complete")
}

package handlers

import (
	"io"
	"log/slog"
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	slog.SetDefault(slog.New(slog.NewJSONHandler(io.Discard, nil)))
	os.Exit(m.Run())
}

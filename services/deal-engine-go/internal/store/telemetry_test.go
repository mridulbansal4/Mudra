package store

import (
	"testing"
	"time"
)

func TestPercentile(t *testing.T) {
	v := make([]float64, 100)
	for i := range v {
		v[i] = float64(i + 1)
	}
	if Percentile(v, 99) != 99 || Percentile(v, 50) != 50 || Percentile(nil, 99) != 0 {
		t.Fatal("percentile")
	}
}

func TestTelemetryRing(t *testing.T) {
	tm := NewTelemetry()
	for i := 0; i < 5000; i++ {
		tm.RecordFSM(time.Duration(i) * time.Nanosecond)
	}
	s := tm.Snapshot()
	if s.FSMSamples != 4096 || s.Transitions != 5000 || s.FSMP99Ms <= 0 {
		t.Fatalf("%+v", s)
	}
}

func TestFreezeRemaining(t *testing.T) {
	now := time.Now()
	d := &Dispute{FreezeExpiresAt: now.Add(90 * time.Second), Status: "FROZEN_OPEN"}
	if r := d.FreezeRemainingSec(now); r != 90 {
		t.Fatalf("%d", r)
	}
	if r := d.FreezeRemainingSec(now.Add(2 * time.Minute)); r != 0 {
		t.Fatalf("%d", r)
	}
}

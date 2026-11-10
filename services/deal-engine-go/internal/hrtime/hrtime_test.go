package hrtime

import (
	"testing"
	"time"
)

func TestMonotonicAndResolution(t *testing.T) {
	a := Now()
	time.Sleep(2 * time.Millisecond)
	if d := Since(a); d < time.Millisecond || d > time.Second {
		t.Fatalf("elapsed %v", d)
	}
	// resolution: some back-to-back pair must differ by < 100µs but > 0
	ok := false
	for i := 0; i < 1000 && !ok; i++ {
		x := Now()
		s := 0
		for j := 0; j < 1000; j++ {
			s += j
		}
		_ = s
		if d := Since(x); d > 0 && d < 100*time.Microsecond {
			ok = true
		}
	}
	if !ok {
		t.Fatal("no sub-100µs resolution")
	}
}

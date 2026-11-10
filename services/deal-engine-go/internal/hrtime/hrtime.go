// Package hrtime provides a high-resolution monotonic stopwatch. On Windows,
// Go's monotonic clock advances only once per scheduler tick (~0.5–15.6 ms),
// so sub-microsecond FSM transitions would always measure 0; there we read
// QueryPerformanceCounter directly (no cgo). Elsewhere we use time.Now.
package hrtime

import "time"

// Stamp is an opaque high-resolution timestamp.
type Stamp int64

// Since returns the elapsed duration since s.
func Since(s Stamp) time.Duration { return time.Duration(int64(Now()) - int64(s)) }

//go:build windows

package hrtime

import (
	"syscall"
	"time"
	"unsafe"
)

var (
	kernel32 = syscall.NewLazyDLL("kernel32.dll")
	qpc      = kernel32.NewProc("QueryPerformanceCounter")
	qpf      = kernel32.NewProc("QueryPerformanceFrequency")
	freq     int64
	epoch    = time.Now()
)

func init() {
	if err := qpf.Find(); err == nil {
		_, _, _ = qpf.Call(uintptr(unsafe.Pointer(&freq)))
	}
}

// Now returns a nanosecond stamp derived from QueryPerformanceCounter.
func Now() Stamp {
	if freq <= 0 {
		return Stamp(time.Since(epoch))
	}
	var c int64
	_, _, _ = qpc.Call(uintptr(unsafe.Pointer(&c)))
	// split to avoid overflow: c/freq seconds + remainder
	sec := c / freq
	rem := c % freq
	return Stamp(sec*int64(time.Second) + rem*int64(time.Second)/freq)
}

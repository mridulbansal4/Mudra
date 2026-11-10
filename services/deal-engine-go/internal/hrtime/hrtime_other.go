//go:build !windows

package hrtime

import "time"

var epoch = time.Now()

// Now returns a nanosecond-resolution stamp.
func Now() Stamp { return Stamp(time.Since(epoch)) }

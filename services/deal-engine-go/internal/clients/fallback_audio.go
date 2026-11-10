package clients

import (
	"encoding/binary"
	"errors"
	"math"
)

// RPMFromPCMGo estimates the dominant rotational frequency (20–200 Hz band,
// i.e. 1,200–12,000 RPM) from little-endian float32 PCM. It box-decimates to
// ~1 kHz and runs a Goertzel scan at 0.25 Hz steps with parabolic refinement.
// This is the Go fallback for Rust's 4096-pt rustfft; it does not compute
// bearing-noise ratio.
func RPMFromPCMGo(pcm []byte, sampleRate int) (float64, error) {
	if sampleRate <= 0 {
		sampleRate = 48000
	}
	if len(pcm) < 4*256 {
		return 0, errors.New("audio too short")
	}
	n := len(pcm) / 4
	if maxN := sampleRate * 2; n > maxN {
		n = maxN
	}
	samples := make([]float64, n)
	for i := 0; i < n; i++ {
		v := math.Float32frombits(binary.LittleEndian.Uint32(pcm[i*4:]))
		if math.IsNaN(float64(v)) || math.IsInf(float64(v), 0) {
			v = 0
		}
		samples[i] = float64(v)
	}
	dec := max(1, sampleRate/1000)
	fs := float64(sampleRate) / float64(dec)
	m := n / dec
	if m < 128 {
		return 0, errors.New("audio too short after decimation")
	}
	x := make([]float64, m)
	mean := 0.0
	for i := 0; i < m; i++ {
		s := 0.0
		for j := 0; j < dec; j++ {
			s += samples[i*dec+j]
		}
		x[i] = s / float64(dec)
		mean += x[i]
	}
	mean /= float64(m)
	for i := range x {
		// remove DC and apply Hann window
		x[i] = (x[i] - mean) * (0.5 - 0.5*math.Cos(2*math.Pi*float64(i)/float64(m-1)))
	}
	const fLo, fHi, step = 20.0, 200.0, 0.25
	steps := int((fHi-fLo)/step) + 1
	pow := make([]float64, steps)
	best := 0
	for k := 0; k < steps; k++ {
		f := fLo + float64(k)*step
		coeff := 2 * math.Cos(2*math.Pi*f/fs)
		var s1, s2 float64
		for _, v := range x {
			s0 := v + coeff*s1 - s2
			s2, s1 = s1, s0
		}
		pow[k] = s1*s1 + s2*s2 - coeff*s1*s2
		if pow[k] > pow[best] {
			best = k
		}
	}
	if pow[best] < 1e-9 {
		return 0, errors.New("silent audio")
	}
	f := fLo + float64(best)*step
	if best > 0 && best < steps-1 {
		a, b, c := pow[best-1], pow[best], pow[best+1]
		if d := a - 2*b + c; d != 0 {
			f += 0.5 * (a - c) / d * step
		}
	}
	return math.Round(f*60*10) / 10, nil
}

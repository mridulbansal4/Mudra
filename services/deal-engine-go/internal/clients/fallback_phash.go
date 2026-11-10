package clients

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"image"
	_ "image/jpeg" // register JPEG decoder
	_ "image/png"  // register PNG decoder (canvas snapshots)
	"math"
	"math/bits"
	"sort"
	"strconv"
	"strings"
)

// DecodeBase64Payload accepts raw or data-URL base64 (std or URL alphabet).
func DecodeBase64Payload(s string) ([]byte, error) {
	s = strings.TrimSpace(s)
	if i := strings.Index(s, ","); strings.HasPrefix(s, "data:") && i > 0 {
		s = s[i+1:]
	}
	if b, err := base64.StdEncoding.DecodeString(s); err == nil {
		return b, nil
	}
	if b, err := base64.RawStdEncoding.DecodeString(strings.TrimRight(s, "=")); err == nil {
		return b, nil
	}
	return base64.URLEncoding.DecodeString(s)
}

// PHashTieEpsilon makes the median threshold robust to float noise: coefficients
// that are mathematically equal to the median (common on flat or upscaled frames)
// must not flip bits depending on summation order. Shared with Rust, WASM and TS.
const PHashTieEpsilon = 1e-9

// PHashGo computes the same 64-bit DCT perceptual hash as services/assay-verifier-rs
// (see its README): luma 0.299/0.587/0.114 -> 32x32 integer-boundary block average ->
// orthonormal DCT-II top-left 8x8 -> median = sorted AC[31] -> bit (63-i) = F[i] > median+eps.
func PHashGo(img []byte) (string, error) {
	src, _, err := image.Decode(bytes.NewReader(img))
	if err != nil {
		return "", fmt.Errorf("decode frame: %w", err)
	}
	b := src.Bounds()
	w, h := b.Dx(), b.Dy()
	if w < 1 || h < 1 {
		return "", errors.New("empty frame")
	}
	lum := make([]float64, w*h)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			r, g, bl, _ := src.At(b.Min.X+x, b.Min.Y+y).RGBA()
			lum[y*w+x] = 0.299*float64(r>>8) + 0.587*float64(g>>8) + 0.114*float64(bl>>8)
		}
	}
	return fmt.Sprintf("%016x", phashFromLuma(lum, w, h)), nil
}

func phashFromLuma(lum []float64, w, h int) uint64 {
	const n, k = 32, 8
	var g [n * n]float64
	for oy := 0; oy < n; oy++ {
		y0 := oy * h / n
		y1 := max((oy+1)*h/n, y0+1)
		for ox := 0; ox < n; ox++ {
			x0 := ox * w / n
			x1 := max((ox+1)*w/n, x0+1)
			sum, count := 0.0, 0.0
			for y := y0; y < y1; y++ {
				for x := x0; x < x1; x++ {
					sum += lum[y*w+x]
					count++
				}
			}
			g[oy*n+ox] = sum / count
		}
	}
	var cosT [k][n]float64
	for u := 0; u < k; u++ {
		for x := 0; x < n; x++ {
			cosT[u][x] = math.Cos(float64((2*x+1)*u) * math.Pi / (2 * n))
		}
	}
	alpha := func(u int) float64 {
		if u == 0 {
			return math.Sqrt(1.0 / n)
		}
		return math.Sqrt(2.0 / n)
	}
	var coeff [k * k]float64
	for u := 0; u < k; u++ {
		for v := 0; v < k; v++ {
			s := 0.0
			for y := 0; y < n; y++ {
				for x := 0; x < n; x++ {
					s += g[y*n+x] * cosT[u][y] * cosT[v][x]
				}
			}
			coeff[u*k+v] = alpha(u) * alpha(v) * s
		}
	}
	sorted := append([]float64(nil), coeff[1:]...)
	sort.Float64s(sorted)
	median := sorted[31]
	var hash uint64
	for i, c := range coeff {
		if c > median+PHashTieEpsilon {
			hash |= 1 << (63 - i)
		}
	}
	return hash
}

// ParsePHash parses a 1..16 char hex pHash.
func ParsePHash(h string) (uint64, error) {
	h = strings.TrimPrefix(strings.ToLower(strings.TrimSpace(h)), "0x")
	if h == "" || len(h) > 16 {
		return 0, fmt.Errorf("invalid pHash %q", h)
	}
	return strconv.ParseUint(h, 16, 64)
}

// HammingGo returns the bit distance between two 64-bit hex pHashes.
func HammingGo(a, b string) (int, error) {
	x, err := ParsePHash(a)
	if err != nil {
		return 0, err
	}
	y, err := ParsePHash(b)
	if err != nil {
		return 0, err
	}
	return bits.OnesCount64(x ^ y), nil
}

package clients

import "testing"

// Same synthetic image and expected hashes as services/assay-verifier-rs
// phash::tests::cross_language_vectors — keeps the Go fallback bit-identical to Rust.
func parityLuma(w, h int) []float64 {
	l := make([]float64, w*h)
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			r := float64((x * 4) % 256)
			g := float64((y * 5) % 256)
			b := float64((x * y) % 256)
			l[y*w+x] = 0.299*r + 0.587*g + 0.114*b
		}
	}
	return l
}

func TestPHashMatchesRustVectors(t *testing.T) {
	cases := []struct {
		w, h int
		want string
	}{{64, 48, "80031f3f3e787971"}, {20, 10, "8055005580550055"}}
	for _, c := range cases {
		got := phashFromLuma(parityLuma(c.w, c.h), c.w, c.h)
		if s := fmtHash(got); s != c.want {
			t.Fatalf("%dx%d: got %s want %s", c.w, c.h, s, c.want)
		}
	}
}

func fmtHash(h uint64) string {
	const hexd = "0123456789abcdef"
	b := make([]byte, 16)
	for i := 15; i >= 0; i-- {
		b[i] = hexd[h&0xf]
		h >>= 4
	}
	return string(b)
}

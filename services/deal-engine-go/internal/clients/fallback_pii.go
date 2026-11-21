package clients

import (
	"regexp"

	"github.com/chanakya-team/mudra-os/services/deal-engine-go/internal/hrtime"
)

// PIIToken replaces every redacted span (contract §6).
const PIIToken = "[REDACTED_DPDP_PII]"

type piiRule struct {
	category string
	re       *regexp.Regexp
}

// Order matters: email before UPI (both contain '@'), Aadhaar before phone.
var piiRules = []piiRule{
	{"EMAIL", regexp.MustCompile(`[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}`)},
	{"UPI", regexp.MustCompile(`\b[A-Za-z0-9._\-]{2,256}@[A-Za-z]{2,64}\b`)},
	{"PAN", regexp.MustCompile(`\b[A-Z]{5}[0-9]{4}[A-Z]\b`)},
	{"IFSC", regexp.MustCompile(`\b[A-Z]{4}0[A-Z0-9]{6}\b`)},
	{"AADHAAR", regexp.MustCompile(`\b[2-9][0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4}\b`)},
	{"PHONE", regexp.MustCompile(`(?:\+91[\s\-]?|\b)[6-9][0-9]{4}[\s\-]?[0-9]{5}\b`)},
}

// ScrubResult mirrors Rust POST /internal/scrub-pii.
type ScrubResult struct {
	ScrubbedText  string   `json:"scrubbed_text"`
	RedactedCount int      `json:"redacted_count"`
	Categories    []string `json:"categories"`
	ScrubTimeUS   int64    `json:"scrub_time_us"`
	Engine        string   `json:"engine"`
}

// ScrubPIIGo is the native Go regex DPDP scrubber fallback.
func ScrubPIIGo(text string) ScrubResult {
	start := hrtime.Now()
	out := text
	count := 0
	cats := []string{}
	for _, r := range piiRules {
		n := 0
		out = r.re.ReplaceAllStringFunc(out, func(string) string { n++; return PIIToken })
		if n > 0 {
			count += n
			cats = append(cats, r.category)
		}
	}
	return ScrubResult{
		ScrubbedText:  out,
		RedactedCount: count,
		Categories:    cats,
		ScrubTimeUS:   hrtime.Since(start).Microseconds(),
		Engine:        EngineGoFallback,
	}
}

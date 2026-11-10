//! DPDP Act 2023 PII scrubber for Indian identifiers.
//!
//! Categories (applied in this order, each pass runs over the previous output):
//!   1. EMAIL    `local@domain.tld`
//!   2. UPI      UPI VPA `name@handle` (e.g. `ramesh.k@okaxis`, `9876543210@ybl`)
//!   3. AADHAAR  12 digits, first digit 2-9, optional single space/hyphen between
//!      groups of 4 (`XXXX XXXX XXXX`); only redacted if the Verhoeff
//!      checksum validates (so random 12-digit numbers are left alone)
//!   4. PHONE    Indian mobile `[6-9]XXXXXXXXX` with optional `+91` / `0` prefix,
//!      optional space/hyphen after the 5th digit (`98765 43210`)
//!   5. PAN      `[A-Z]{5}[0-9]{4}[A-Z]`
//!   6. IFSC     `[A-Z]{4}0[A-Z0-9]{6}`
//!
//! Every match is replaced by `[REDACTED_DPDP_PII]`. ASCII digit classes
//! (`[0-9]`) are used deliberately so Devanagari/Tamil digits are not treated
//! as Arabic numerals, and the surrounding Indic text is preserved byte-for-byte.

use std::collections::BTreeMap;
use std::sync::LazyLock;
use std::time::Instant;

use regex::{Captures, Regex};
use serde::Serialize;

pub const REDACTION_TOKEN: &str = "[REDACTED_DPDP_PII]";

static EMAIL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9\-]+(?:\.[A-Za-z0-9\-]+)*\.[A-Za-z]{2,}").expect("email regex")
});
static UPI_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[A-Za-z0-9][A-Za-z0-9._\-]{1,255}@[A-Za-z][A-Za-z0-9]{1,63}\b").expect("upi regex")
});
static AADHAAR_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"\b[2-9][0-9]{3}[ \-]?[0-9]{4}[ \-]?[0-9]{4}\b").expect("aadhaar regex")
});
static PHONE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?:\+91[ \-]?|\b0|\b)[6-9][0-9]{4}[ \-]?[0-9]{5}\b").expect("phone regex")
});
static PAN_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b[A-Z]{5}[0-9]{4}[A-Z]\b").expect("pan regex"));
static IFSC_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b[A-Z]{4}0[A-Z0-9]{6}\b").expect("ifsc regex"));

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct ScrubResult {
    pub scrubbed_text: String,
    pub redacted_count: usize,
    /// Categories that had at least one redaction, in canonical order.
    pub categories: Vec<String>,
    /// Count per category (only categories with > 0 hits).
    pub category_counts: BTreeMap<String, usize>,
    pub scrub_time_us: u64,
}

// Verhoeff tables.
const VERHOEFF_D: [[u8; 10]; 10] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
    [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
    [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
    [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
    [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
    [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
    [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
    [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
    [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P: [[u8; 10]; 8] = [
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
    [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
    [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
    [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
    [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
    [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
    [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/// Returns true if the ASCII digit string (other chars ignored) has a valid
/// Verhoeff check digit as its last digit.
pub fn verhoeff_valid(s: &str) -> bool {
    let digits: Vec<u8> = s.bytes().filter(|b| b.is_ascii_digit()).map(|b| b - b'0').collect();
    if digits.is_empty() {
        return false;
    }
    let mut c: u8 = 0;
    for (i, &d) in digits.iter().rev().enumerate() {
        c = VERHOEFF_D[c as usize][VERHOEFF_P[i % 8][d as usize] as usize];
    }
    c == 0
}

/// Replaces every match of `re` in `text` with the token, counting matches.
fn redact_simple(re: &Regex, text: &str, count: &mut usize) -> String {
    re.replace_all(text, |_caps: &Captures| {
        *count += 1;
        REDACTION_TOKEN
    })
    .into_owned()
}

pub fn scrub(text: &str) -> ScrubResult {
    let start = Instant::now();
    let mut counts: Vec<(&'static str, usize)> = Vec::with_capacity(6);
    let mut current = text.to_string();

    let mut n = 0usize;
    current = redact_simple(&EMAIL_RE, &current, &mut n);
    counts.push(("EMAIL", n));

    let mut n = 0usize;
    current = redact_simple(&UPI_RE, &current, &mut n);
    counts.push(("UPI", n));

    let mut n = 0usize;
    let replaced = AADHAAR_RE
        .replace_all(&current, |caps: &Captures| {
            let whole = caps.get(0).expect("group 0 always present");
            let m = whole.as_str();
            // "+91XXXXXXXXXX" is a phone number, never an Aadhaar.
            let preceded_by_plus = current[..whole.start()].ends_with('+');
            if !preceded_by_plus && verhoeff_valid(m) {
                n += 1;
                REDACTION_TOKEN.to_string()
            } else {
                m.to_string()
            }
        })
        .into_owned();
    current = replaced;
    counts.push(("AADHAAR", n));

    let mut n = 0usize;
    current = redact_simple(&PHONE_RE, &current, &mut n);
    counts.push(("PHONE", n));

    let mut n = 0usize;
    current = redact_simple(&PAN_RE, &current, &mut n);
    counts.push(("PAN", n));

    let mut n = 0usize;
    current = redact_simple(&IFSC_RE, &current, &mut n);
    counts.push(("IFSC", n));

    // Canonical output order per contract: PHONE, AADHAAR, PAN, UPI, IFSC, EMAIL.
    const ORDER: [&str; 6] = ["PHONE", "AADHAAR", "PAN", "UPI", "IFSC", "EMAIL"];
    let mut categories = Vec::new();
    let mut category_counts = BTreeMap::new();
    let mut total = 0usize;
    for cat in ORDER {
        let c = counts.iter().find(|(k, _)| *k == cat).map(|(_, v)| *v).unwrap_or(0);
        if c > 0 {
            categories.push(cat.to_string());
            category_counts.insert(cat.to_string(), c);
            total += c;
        }
    }

    ScrubResult {
        scrubbed_text: current,
        redacted_count: total,
        categories,
        category_counts,
        scrub_time_us: start.elapsed().as_micros() as u64,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    // Valid Verhoeff Aadhaar-format test numbers (synthetic, not real people):
    // 234567890124, 499812345673. Invalid: 234567890125.

    #[test]
    fn verhoeff_known_values() {
        assert!(verhoeff_valid("2363"));
        assert!(verhoeff_valid("234567890124"));
        assert!(verhoeff_valid("4998 1234 5673"));
        assert!(!verhoeff_valid("234567890125"));
        assert!(!verhoeff_valid(""));
    }

    #[test]
    fn redacts_phone_variants() {
        for input in [
            "call 9876543210 now",
            "call +919876543210 now",
            "call +91 98765 43210 now",
            "call +91-9876543210 now",
            "call 09876543210 now",
        ] {
            let r = scrub(input);
            assert_eq!(r.scrubbed_text, format!("call {} now", REDACTION_TOKEN), "input: {input}");
            assert_eq!(r.categories, vec!["PHONE".to_string()], "input: {input}");
            assert_eq!(r.redacted_count, 1);
        }
    }

    #[test]
    fn does_not_redact_non_mobile_numbers() {
        // starts with 5 -> not an Indian mobile; 8 digits -> too short.
        let r = scrub("order 5876543210 qty 12345678");
        assert_eq!(r.redacted_count, 0);
        assert_eq!(r.scrubbed_text, "order 5876543210 qty 12345678");
    }

    #[test]
    fn redacts_valid_aadhaar_and_keeps_invalid() {
        let r = scrub("aadhaar 2345 6789 0124 and 499812345673");
        assert_eq!(
            r.scrubbed_text,
            format!("aadhaar {t} and {t}", t = REDACTION_TOKEN)
        );
        assert_eq!(r.category_counts.get("AADHAAR"), Some(&2));

        let bad = scrub("ref 2345 6789 0125 end");
        assert_eq!(bad.scrubbed_text, "ref 2345 6789 0125 end");
        assert_eq!(bad.redacted_count, 0);

        let bad2 = scrub("ref 234567890125 end");
        assert_eq!(bad2.scrubbed_text, "ref 234567890125 end");
    }

    #[test]
    fn redacts_pan_ifsc_upi_email() {
        let r = scrub("PAN ABCDE1234F ifsc HDFC0001234 upi ramesh.k@okaxis mail ramesh@example.co.in");
        assert_eq!(
            r.scrubbed_text,
            format!("PAN {t} ifsc {t} upi {t} mail {t}", t = REDACTION_TOKEN)
        );
        assert_eq!(r.redacted_count, 4);
        assert_eq!(
            r.categories,
            vec!["PAN".to_string(), "UPI".to_string(), "IFSC".to_string(), "EMAIL".to_string()]
        );
    }

    #[test]
    fn phone_number_upi_counts_as_upi() {
        let r = scrub("pay 9876543210@ybl");
        assert_eq!(r.scrubbed_text, format!("pay {}", REDACTION_TOKEN));
        assert_eq!(r.categories, vec!["UPI".to_string()]);
    }

    #[test]
    fn preserves_devanagari_and_tamil() {
        let hi = "मेरा नंबर 9876543210 है और पैन ABCDE1234F है";
        let r = scrub(hi);
        assert_eq!(
            r.scrubbed_text,
            format!("मेरा नंबर {t} है और पैन {t} है", t = REDACTION_TOKEN)
        );
        assert_eq!(r.redacted_count, 2);

        let ta = "என் எண் +91 98765 43210 ஆகும், ஆதார் 2345 6789 0124";
        let r = scrub(ta);
        assert_eq!(
            r.scrubbed_text,
            format!("என் எண் {t} ஆகும், ஆதார் {t}", t = REDACTION_TOKEN)
        );
        assert_eq!(r.category_counts.get("PHONE"), Some(&1));
        assert_eq!(r.category_counts.get("AADHAAR"), Some(&1));

        // Devanagari digits are not ASCII digits and must be left alone.
        let r = scrub("मूल्य ९८७६५४३२१० रुपये");
        assert_eq!(r.redacted_count, 0);
        assert_eq!(r.scrubbed_text, "मूल्य ९८७६५४३२१० रुपये");
    }

    #[test]
    fn clean_text_untouched() {
        let s = "Juki DDL-8700 at 4820 RPM, warranty 6 months, price 18500";
        let r = scrub(s);
        assert_eq!(r.scrubbed_text, s);
        assert_eq!(r.redacted_count, 0);
        assert!(r.categories.is_empty());
    }
}

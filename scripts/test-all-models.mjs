import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

// Load .env
const envFile = readFileSync(".env", "utf8");
const env = {};
for (const line of envFile.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_0-9]+)\s*=\s*"?([^"#]+)?"?/);
  if (m) env[m[1]] = m[2]?.trim() ?? "";
}

const HMAC_SECRET = env.INTERNAL_SERVICE_HMAC_SECRET || "dev_internal_hmac_secret_change_in_prod_32b";
const BRIDGE_URL = "http://127.0.0.1:4001";
const GO_URL = "http://127.0.0.1:4002";
const RUST_URL = "http://127.0.0.1:4003";
const WEB_URL = "http://localhost:5173";

function sign(body) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const digest = createHmac("sha256", HMAC_SECRET)
    .update(`${ts}.${raw}`)
    .digest("hex");
  return {
    "content-type": "application/json",
    "x-internal-timestamp": ts,
    "x-internal-signature": digest,
  };
}

/** Synthesize motor acoustic audio: fundamental at (rpm/60) Hz + harmonics + light noise as f32 LE base64 */
function synthMotorPcmBase64(rpm = 4800, sampleRate = 48000, durationSec = 0.5) {
  const numSamples = Math.floor(sampleRate * durationSec);
  const buffer = new Float32Array(numSamples);
  const freq = rpm / 60; // 80 Hz for 4800 RPM
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    buffer[i] =
      0.6 * Math.sin(2 * Math.PI * freq * t) +
      0.3 * Math.sin(2 * Math.PI * 2 * freq * t) +
      0.1 * Math.sin(2 * Math.PI * 3 * freq * t) +
      0.02 * (Math.random() * 2 - 1);
  }
  return Buffer.from(buffer.buffer).toString("base64");
}

// Valid 64x64 baseline JPEG base64 for frame testing
const SAMPLE_JPEG_B64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABAAEADASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3EKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooA//Z";

async function runTests() {
  console.log("=================================================");
  console.log("       MUDRA AI & MODEL INTEGRATION SUITE        ");
  console.log("=================================================\n");

  let passed = 0;
  let total = 0;

  function assert(cond, name, details = "") {
    total++;
    if (cond) {
      passed++;
      console.log(`[PASS] ${name} ${details ? "- " + details : ""}`);
    } else {
      console.error(`[FAIL] ${name} ${details ? "- " + details : ""}`);
    }
  }

  // -----------------------------------------------------------------
  // TEST 0: Service Health Checks
  // -----------------------------------------------------------------
  try {
    const [bH, gH, rH, wH] = await Promise.all([
      fetch(`${BRIDGE_URL}/health`).then((r) => r.json()),
      fetch(`${GO_URL}/health`).then((r) => r.json()),
      fetch(`${RUST_URL}/health`).then((r) => r.json()),
      fetch(WEB_URL).then((r) => ({ status: r.status })),
    ]);
    assert(bH.status === "ok", "Node Bridge Health (:4001)", `mode=${bH.mode}, gemini=${bH.gemini}`);
    assert(gH.status === "ok", "Go Deal Engine Health (:4002)", `version=${gH.version}`);
    assert(rH.status === "ok", "Rust Assay Verifier Health (:4003)", `pubkey=${rH.public_key_hex?.slice(0, 16)}...`);
    assert(wH.status === 200, "Vite Web Frontend Health (:5173)", `HTTP ${wH.status}`);
  } catch (e) {
    assert(false, "Service Health Check Exception", e.message);
  }

  // -----------------------------------------------------------------
  // TEST 1: Rust PII Scrubber (Aho-Corasick DPDP scrubber)
  // -----------------------------------------------------------------
  try {
    const rawText = "Contact me at 9876543210 or Aadhaar 2345 6789 0123 for payment of ₹1,45,000";
    const body = { text: rawText };
    const res = await fetch(`${RUST_URL}/internal/scrub-pii`, {
      method: "POST",
      headers: sign(body),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert(res.ok, "Rust PII Scrubber HTTP 200", `status=${res.status}`);
    assert(data.redacted_count > 0, "Rust PII Redaction Count", `redacted=${data.redacted_count}`);
    assert(data.scrubbed_text && data.scrubbed_text.includes("[REDACTED_"), "Rust PII Tokens Present", data.scrubbed_text);
  } catch (e) {
    assert(false, "Rust PII Scrubber Exception", e.message);
  }

  // -----------------------------------------------------------------
  // TEST 2: Rust 4096-point FFT Motor RPM & 64-bit DCT pHash
  // -----------------------------------------------------------------
  try {
    const audioB64 = synthMotorPcmBase64(4800, 48000, 0.5);
    const body = {
      frame_jpeg_base64: SAMPLE_JPEG_B64,
      audio_pcm_f32_base64: audioB64,
      sample_rate: 48000,
      min_motor_rpm: 4500,
    };
    const res = await fetch(`${RUST_URL}/internal/verify-assay`, {
      method: "POST",
      headers: sign(body),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert(res.ok, "Rust Acoustic RPM & pHash HTTP 200", `status=${res.status}`);
    assert(Boolean(data.frame_phash_hex), "Rust 64-bit DCT pHash Generated", `phash=${data.frame_phash_hex}`);
    assert(data.audio_fft_rpm_peak >= 4700 && data.audio_fft_rpm_peak <= 4900, "Rust 4096-pt FFT RPM Peak Accuracy", `measured=${data.audio_fft_rpm_peak} RPM (target 4800)`);
    assert(data.rpm_ok === true, "Rust Minimum RPM Check Passed", `min=4500, rpm_ok=${data.rpm_ok}`);
    assert(data.compute_ms < 50, "Rust High-Performance Compute Time", `${data.compute_ms}ms`);
  } catch (e) {
    assert(false, "Rust Assay Verification Exception", e.message);
  }

  // -----------------------------------------------------------------
  // TEST 3: M-01 Bilingual Translation & Term Extraction (Gemini Flash)
  // -----------------------------------------------------------------
  try {
    const body = {
      text: "नमस्ते, हमें 10 सिलाई मशीन ₹1,45,000 में चाहिए। 4800 RPM मोटर और 6 महीने की वारंटी होनी चाहिए।",
      source_locale: "hi-IN",
      target_locale: "en-IN",
    };
    const res = await fetch(`${BRIDGE_URL}/internal/ai/translate`, {
      method: "POST",
      headers: sign(body),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert(res.ok, "M-01 Translation HTTP 200", `status=${res.status}`);
    assert(data.ai_mode === "gemini", "M-01 AI Mode Gemini", `mode=${data.ai_mode}, model=${data.model}`);
    assert(Boolean(data.translated_text && data.translated_text.length > 5), "M-01 Translated Text Output", `"${data.translated_text?.slice(0, 60)}..."`);
    assert(data.extracted_terms?.offered_amount_paise === 14500000 || data.extracted_terms?.offered_amount_paise > 0, "M-01 Term Extraction Amount", `amount_paise=${data.extracted_terms?.offered_amount_paise}`);
  } catch (e) {
    assert(false, "M-01 Translation Exception", e.message);
  }

  // -----------------------------------------------------------------
  // TEST 4: M-04 AI Dispute Tribunal (Gemini Pro)
  // -----------------------------------------------------------------
  try {
    const body = {
      deal_title: "Juki MO-6814S Industrial Overlock Machine",
      amount_paise: 14500000,
      reason_code: "DEFECTIVE_MOTOR",
      description: "Motor runs at only 3100 RPM instead of the required 4800 RPM nominal, causing heavy stitch skip and oil leak.",
      hamming_distance: 14,
      rpm_peak: 3100,
      nominal_rpm: 4800,
    };
    const res = await fetch(`${BRIDGE_URL}/internal/ai/tribunal`, {
      method: "POST",
      headers: sign(body),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert(res.ok, "M-04 Tribunal HTTP 200", `status=${res.status}`);
    assert(data.ai_mode === "gemini", "M-04 AI Mode Gemini", `mode=${data.ai_mode}, model=${data.model}`);
    const sum = (data.buyer_refund_bps ?? 0) + (data.seller_payout_bps ?? 0);
    assert(sum === 10000, "M-04 BPS Invariant (Sum to 10,000)", `buyer=${data.buyer_refund_bps}, seller=${data.seller_payout_bps}`);
    assert(Boolean(data.summary && data.rationale), "M-04 Verdict Details", `Summary: "${data.summary?.slice(0, 50)}..."`);
  } catch (e) {
    assert(false, "M-04 Tribunal Exception", e.message);
  }

  // -----------------------------------------------------------------
  // TEST 5: M-05 AI Shopkeeper Negotiation (Gemini Flash)
  // -----------------------------------------------------------------
  try {
    const body = {
      item_title: "Brass Tanjore Urli (Vintage 1974)",
      sticker_price_paise: 4500000,
      counter_offer_paise: 3800000,
      accepted: false,
      offered_amount_paise: 3200000,
      message_text: "Bhaiya ₹32,000 mein de do, instant cash abhi final karta hoon.",
      locale: "hi-IN",
    };
    const res = await fetch(`${BRIDGE_URL}/internal/ai/shopkeeper`, {
      method: "POST",
      headers: sign(body),
      body: JSON.stringify(body),
    });
    const data = await res.json();
    assert(res.ok, "M-05 Shopkeeper HTTP 200", `status=${res.status}`);
    assert(data.ai_mode === "gemini", "M-05 AI Mode Gemini", `mode=${data.ai_mode}, model=${data.model}`);
    assert(Boolean(data.reply_text), "M-05 Counter Offer Dialogue", `"${data.reply_text}"`);
  } catch (e) {
    assert(false, "M-05 Shopkeeper Exception", e.message);
  }

  // -----------------------------------------------------------------
  // TEST 6: Go Deal Engine End-to-End Deal Lifecycle
  // -----------------------------------------------------------------
  try {
    // 6a. Sandbox Provision
    const provRes = await fetch(`${GO_URL}/api/v1/sandbox/provision`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ buyer_locale: "ta-IN", seller_locale: "hi-IN" }),
    });
    const prov = await provRes.json();
    assert(provRes.ok, "Go Engine: Sandbox Provisioning", `deal_id=${prov.deal_id}`);
    const dealId = prov.deal_id;
    const buyerJwt = prov.buyer_session?.samadhan_jwt;
    const sellerJwt = prov.seller_session?.samadhan_jwt;

    // 6b. Translate Stream (Buyer sends Tamil inquiry -> Hindi translation streamed)
    const streamRes = await fetch(`${GO_URL}/api/v1/deals/${dealId}/translate-stream`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${buyerJwt}`,
      },
      body: JSON.stringify({
        source_locale: "ta-IN",
        target_locale: "hi-IN",
        raw_text: "வணக்கம், இந்த இயந்திரத்தின் விலை ₹1,45,000 உறுதி செய்யப்பட்டுள்ளது.",
      }),
    });
    const streamData = await streamRes.json();
    assert(streamRes.ok, "Go Engine: Translate Stream via Bridge", `translated="${streamData.translated_text?.slice(0, 35)}..."`);

    // 6c. Lock Escrow FSM (Transition CREATED -> FUNDED)
    const lockRes = await fetch(`${GO_URL}/api/v1/deals/${dealId}/escrow/transition`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${buyerJwt}`,
      },
      body: JSON.stringify({
        action: "LOCK_ESCROW",
        expected_version: 1,
        upi_mandate_umn: "mandate_upi_test_umn_12345",
      }),
    });
    const lockData = await lockRes.json();
    assert(lockRes.ok && lockData.fsm_state === "FUNDED", "Go Engine: Escrow Transition LOCK_ESCROW", `state=${lockData.fsm_state}, version=${lockData.version}`);

    // 6d. Start Assay Challenge (Get nonce & start inspection)
    const assayStartRes = await fetch(`${GO_URL}/api/v1/deals/${dealId}/assay/start`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${buyerJwt}`,
      },
      body: JSON.stringify({ stage_tag: "PRE_SHIPMENT", simulated_hd_camera: true }),
    });
    const assayStartData = await assayStartRes.json();
    assert(assayStartRes.ok && assayStartData.challenge_nonce, "Go Engine: Assay Challenge Start", `nonce=${assayStartData.challenge_nonce}, state=${assayStartData.fsm_state}`);

    // 6e. Submit Video Frame + Acoustic Audio -> Rust Verifier & Ed25519 Voucher
    const audioB64 = synthMotorPcmBase64(4820, 48000, 0.5);
    const verifyFrameRes = await fetch(`${GO_URL}/api/v1/deals/${dealId}/assay/verify-frame`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${sellerJwt}`,
      },
      body: JSON.stringify({
        stage_tag: "PRE_SHIPMENT",
        challenge_nonce: assayStartData.challenge_nonce,
        wasm_blur_laplacian: 150.0,
        frame_jpeg_base64: SAMPLE_JPEG_B64,
        audio_pcm_f32_base64: audioB64,
        sample_rate: 48000,
        detected_serial_text: "JUKI-MO-6814S-8821",
      }),
    });
    const verifyData = await verifyFrameRes.json();
    assert(verifyFrameRes.ok && verifyData.assay_passed === true, "Go Engine: Verify Frame & Ed25519 Voucher", `state=${verifyData.fsm_state}, voucher_type=${verifyData.system_voucher?.voucher_type}`);

    // 6f. Chanakya Arena (Go -> Rust PII -> Bridge Gemini Flash)
    const arenaStartRes = await fetch(`${GO_URL}/api/v1/arena/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ challenger_name: "Srujan", preferred_locale: "hi-IN", item_sku: "JUKI_MO_6814S" }),
    });
    const arenaData = await arenaStartRes.json();
    assert(arenaStartRes.ok && arenaData.run_id, "Go Engine: Arena Start", `run_id=${arenaData.run_id}, sticker=₹${arenaData.sticker_price_paise / 100}`);

    const arenaBidRes = await fetch(`${GO_URL}/api/v1/arena/${arenaData.run_id}/bid`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        offered_amount_paise: 13000000,
        message_text: "Bhaiya please ₹1,30,000 mein final kar do, turant cash payment karunga",
        locale: "hi-IN",
      }),
    });
    const bidData = await arenaBidRes.json();
    assert(arenaBidRes.ok && bidData.reply_text, "Go Engine: Arena Bargain Bid", `reply="${bidData.reply_text}"`);

    // 6g. Raise Dispute & AI Tribunal Deliberation (Go -> Rust pHash -> Bridge Gemini Pro)
    const disputeRes = await fetch(`${GO_URL}/api/v1/deals/${dealId}/dispute/freeze`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${buyerJwt}`,
      },
      body: JSON.stringify({
        reason_code: "TRANSIT_DAMAGE",
        description: "The machine bench is heavily cracked and motor does not spin at full speed.",
        post_delivery_phash_hex: "ffff0000ffff0000",
      }),
    });
    const disputeData = await disputeRes.json();
    assert(disputeRes.ok && disputeData.dispute_id, "Go Engine: Raise Dispute & Tribunal Recommendation", `dispute_id=${disputeData.dispute_id}, state=${disputeData.fsm_state}, refund_bps=${disputeData.recommended_split?.buyer_refund_bps}`);
  } catch (e) {
    assert(false, "Go Engine Flow Exception", e.message);
  }

  console.log("\n=================================================");
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log("=================================================");
  if (passed === total) {
    console.log(">>> ALL INTEGRATIONS, MODELS, AUDIO & FLOWS WORKING PERFECTLY! <<<");
  } else {
    process.exitCode = 1;
  }
}

runTests();

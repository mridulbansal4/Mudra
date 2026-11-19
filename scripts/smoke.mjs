#!/usr/bin/env node
// Smoke test verifying that all SAMADHAN-OS microservices and web app are running and healthy.

const checks = [
  { name: "Bridge (:4001) /health", url: "http://127.0.0.1:4001/health" },
  { name: "Deal Engine (:4002) /health", url: "http://127.0.0.1:4002/health" },
  { name: "Rust Verifier (:4003) /health", url: "http://127.0.0.1:4003/health" },
  { name: "Web App (:5173)", url: "http://localhost:5173" },
  { name: "Deal Engine Telemetry (:4002)", url: "http://127.0.0.1:4002/api/v1/traction/telemetry" },
];

async function checkUrl(url, timeoutMs = 3000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    return { ok: res.ok, status: res.status };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, error: err.message };
  }
}

async function run() {
  console.log("Checking SAMADHAN-OS services health...\n");
  let allOk = true;

  for (const c of checks) {
    const res = await checkUrl(c.url);
    if (res.ok) {
      console.log(` \x1b[32m✔\x1b[0m ${c.name} [HTTP ${res.status}]`);
    } else {
      console.log(` \x1b[31m✘\x1b[0m ${c.name} [${res.error || `HTTP ${res.status}`}]`);
      allOk = false;
    }
  }

  // Also test Sandbox Provisioning endpoint on Go Engine
  try {
    const res = await fetch("http://127.0.0.1:4002/api/v1/sandbox/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "buyer" }),
    });
    if (res.ok) {
      const data = await res.json();
      console.log(` \x1b[32m✔\x1b[0m Go Engine Sandbox Provisioning [dealId: ${data?.deal?.id || "ok"}]`);
    } else {
      console.log(` \x1b[33m⚠\x1b[0m Go Engine Sandbox Provisioning HTTP ${res.status}`);
    }
  } catch (e) {
    console.log(` \x1b[31m✘\x1b[0m Go Engine Sandbox Provisioning failed: ${e.message}`);
  }

  console.log("\n" + (allOk ? "\x1b[32mAll core services are UP and HEALTHY!\x1b[0m" : "\x1b[31mSome services failed to respond.\x1b[0m"));
  process.exit(allOk ? 0 : 1);
}

run();

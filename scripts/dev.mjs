#!/usr/bin/env node
// Starts every service that this machine can run: Go :4002, Node bridge :4001, Rust :4003 (if cargo exists), web :5173.
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const has = (cmd, args = ["--version"]) => spawnSync(cmd, args, { shell: true, stdio: "ignore" }).status === 0;
const colors = { go: 36, bridge: 33, rust: 35, web: 32 };
const children = [];

function run(name, cmd, cwd) {
  const p = spawn(cmd, { cwd: path.join(root, cwd), shell: true, env: process.env });
  const tag = `\x1b[${colors[name]}m[${name}]\x1b[0m `;
  const pipe = (s) => s.on("data", (d) => String(d).split(/\r?\n/).filter(Boolean).forEach((l) => console.log(tag + l)));
  pipe(p.stdout);
  pipe(p.stderr);
  p.on("exit", (code) => console.log(`${tag}exited with ${code}`));
  children.push(p);
}

// Load .env into this process so every child inherits it. Go and Node also read .env themselves,
// but the Rust verifier relies on the environment (notably INTERNAL_SERVICE_HMAC_SECRET).
if (existsSync(path.join(root, ".env"))) process.loadEnvFile(path.join(root, ".env"));
else console.warn("No .env found. Copy .env.example to .env (services run in simulated mode without Nexconn keys).");

if (has("go", ["version"])) run("go", "go run ./cmd/server", "services/deal-engine-go");
else console.warn("Go not found: deal engine (:4002) skipped. The web app needs it.");
run("bridge", "pnpm exec tsx watch src/index.ts", "services/nexconn-bridge-node");
if (has("cargo")) run("rust", "cargo run --release", "services/assay-verifier-rs");
else console.warn("cargo not found: Rust verifier (:4003) skipped. Go and Node use their built-in fallbacks.");
run("web", "pnpm exec vite", "apps/web");

const stop = () => {
  for (const c of children) {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"], { stdio: "ignore" });
    else c.kill("SIGTERM");
  }
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);

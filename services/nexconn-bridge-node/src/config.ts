import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
/** services/nexconn-bridge-node/src -> repo root */
export const REPO_ROOT = resolve(here, "..", "..", "..");
export const SERVICE_ROOT = resolve(here, "..");

/**
 * Load `.env` files (service-local first, then repo root). `process.loadEnvFile`
 * never overrides variables already present in the environment.
 */
export function loadDotEnv(): string[] {
  const loaded: string[] = [];
  for (const p of [resolve(SERVICE_ROOT, ".env"), resolve(REPO_ROOT, ".env")]) {
    if (!existsSync(p)) continue;
    try {
      process.loadEnvFile(p);
      loaded.push(p);
    } catch {
      /* malformed .env - ignore, defaults apply */
    }
  }
  return loaded;
}

export interface BridgeConfig {
  port: number;
  host: string;
  nexconn: {
    appKey: string;
    secretKey: string;
    primaryDomain: string;
    secondaryDomain: string;
    simulated: boolean;
    timeoutMs: number;
    arbitratorBotId: string;
    shopkeeperBotId: string;
    systemVoucherBotId: string;
  };
  gemini: {
    apiKey: string;
    flashModel: string;
    proModel: string;
    enabled: boolean;
    timeoutMs: number;
  };
  rust: {
    url: string;
    scrubTimeoutMs: number;
  };
  internalHmacSecret: string;
  corsOrigins: string[] | true;
}

const clean = (v: string | undefined): string => (v ?? "").trim();

/** True when Nexconn credentials are missing or still the `.env.example` placeholders. */
export function isNexconnSimulated(appKey: string | undefined, secretKey: string | undefined): boolean {
  const k = clean(appKey);
  const s = clean(secretKey);
  if (!k || !s) return true;
  if (k.startsWith("nc_app_replace") || s.startsWith("nc_sec_replace")) return true;
  return false;
}

/** True when a usable Gemini key is configured. */
export function isGeminiConfigured(apiKey: string | undefined): boolean {
  const k = clean(apiKey);
  if (!k) return false;
  if (k.startsWith("AIzaSy_replace") || k.includes("replace_with")) return false;
  return true;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const appKey = clean(env.NEXCONN_APP_KEY);
  const secretKey = clean(env.NEXCONN_SECRET_KEY);
  const primary =
    clean(env.NEXCONN_PRIMARY_API_DOMAIN) || clean(env.NEXCONN_API_BASE_URL) || "https://api.nexconn.ai";
  const secondary = clean(env.NEXCONN_SECONDARY_API_DOMAIN) || primary;
  const geminiKey = clean(env.GEMINI_API_KEY);
  const origins = clean(env.BRIDGE_CORS_ORIGINS);

  return {
    port: Number(env.BRIDGE_PORT || env.PORT || 4001),
    host: clean(env.BRIDGE_HOST) || "0.0.0.0",
    nexconn: {
      appKey,
      secretKey,
      primaryDomain: primary,
      secondaryDomain: secondary,
      simulated: isNexconnSimulated(appKey, secretKey),
      timeoutMs: Number(env.NEXCONN_TIMEOUT_MS || 5000),
      arbitratorBotId: clean(env.NEXCONN_ARBITRATOR_BOT_ID) || "usr_mudra_arbitrator_bot",
      shopkeeperBotId: clean(env.NEXCONN_SHOPKEEPER_BOT_ID) || "usr_chanakya_shopkeeper_bot",
      systemVoucherBotId: clean(env.NEXCONN_SYSTEM_VOUCHER_BOT_ID) || "usr_mudra_system_voucher",
    },
    gemini: {
      apiKey: geminiKey,
      flashModel: clean(env.GEMINI_FLASH_MODEL) || "gemini-2.5-flash",
      proModel: clean(env.GEMINI_PRO_MODEL) || "gemini-2.5-pro",
      enabled: isGeminiConfigured(geminiKey),
      timeoutMs: Number(env.GEMINI_TIMEOUT_MS || 8000),
    },
    rust: {
      url: (clean(env.RUST_ASSAY_VERIFIER_URL) || "http://127.0.0.1:4003").replace(/\/+$/, ""),
      scrubTimeoutMs: Number(env.RUST_SCRUB_TIMEOUT_MS || 300),
    },
    internalHmacSecret: clean(env.INTERNAL_SERVICE_HMAC_SECRET),
    corsOrigins: origins ? origins.split(",").map((o) => o.trim()).filter(Boolean) : true,
  };
}

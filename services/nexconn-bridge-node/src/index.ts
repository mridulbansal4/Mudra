import { buildApp, SERVICE_NAME } from "./app";
import { loadConfig, loadDotEnv } from "./config";

const envFiles = loadDotEnv();
const config = loadConfig();
const app = await buildApp(config, { logger: true });

app.log.info(
  {
    envFiles,
    nexconn_mode: config.nexconn.simulated ? "simulated" : "live",
    nexconn_domains: [config.nexconn.primaryDomain, config.nexconn.secondaryDomain],
    ai_mode: config.gemini.enabled ? "gemini" : "heuristic",
    internal_auth: config.internalHmacSecret ? "hmac-sha256" : "disabled",
    rust: config.rust.url,
  },
  `${SERVICE_NAME} starting`,
);

const shutdown = async (signal: string) => {
  app.log.info(`${signal} received, shutting down`);
  await app.close();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: config.port, host: config.host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

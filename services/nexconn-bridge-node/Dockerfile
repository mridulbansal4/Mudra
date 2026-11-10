# Build context: repository root (see infra/docker/docker-compose.yml)
#   docker build -f services/nexconn-bridge-node/Dockerfile -t samadhan/nexconn-bridge-node .
FROM node:22-alpine

ENV NODE_ENV=production \
    BRIDGE_PORT=4001 \
    BRIDGE_HOST=0.0.0.0 \
    PROMPTS_DIR=/app/ai/prompts

WORKDIR /app/service

# Standalone install (no workspace lockfile needed). tsx is the runtime loader because the
# vendored Nexconn SDK uses extension-less ESM imports. --ignore-scripts: esbuild ships its
# binary via the platform optional dependency, so no postinstall is required.
COPY services/nexconn-bridge-node/package.json ./package.json
RUN npm install --no-audit --no-fund --ignore-scripts --include=dev && npm cache clean --force

COPY services/nexconn-bridge-node/tsconfig.json ./tsconfig.json
COPY services/nexconn-bridge-node/src ./src
COPY ai/prompts /app/ai/prompts

USER node
EXPOSE 4001
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4001/health || exit 1

CMD ["node_modules/.bin/tsx", "src/index.ts"]

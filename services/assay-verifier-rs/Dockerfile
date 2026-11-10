# syntax=docker/dockerfile:1
# ---- build stage ---------------------------------------------------------
FROM rust:1.85-slim AS build
WORKDIR /app

# Cache dependencies: build a dummy main first, then the real sources.
COPY Cargo.toml Cargo.lock* ./
RUN mkdir src && echo "fn main() {}" > src/main.rs \
    && cargo build --release \
    && rm -rf src target/release/deps/assay_verifier_rs* target/release/assay-verifier-rs*

COPY src ./src
RUN cargo build --release

# ---- runtime stage -------------------------------------------------------
FROM debian:bookworm-slim
RUN useradd --system --uid 10001 --no-create-home assay
COPY --from=build /app/target/release/assay-verifier-rs /usr/local/bin/assay-verifier-rs

ENV RUST_ASSAY_VERIFIER_PORT=4003 \
    RUST_LOG=info
EXPOSE 4003
USER 10001
CMD ["/usr/local/bin/assay-verifier-rs"]

## What this changes

<!-- One or two sentences on the change and why. Link the issue if there is one. -->

## How it was tested

- [ ] `pnpm typecheck && pnpm test`
- [ ] `cd services/deal-engine-go && go test -race ./...`
- [ ] `cd services/assay-verifier-rs && cargo fmt --check && cargo clippy --all-targets -- -D warnings && cargo test`
- [ ] Checked the affected routes in the browser (screenshots below for UI changes)

## Checklist

- [ ] No secrets in client code (`NEXCONN_SECRET_KEY` stays in `services/nexconn-bridge-node`)
- [ ] State mutations go through the Go deal engine with `Idempotency-Key` + `expected_version`
- [ ] Docs updated if behaviour or setup changed

## Screenshots

<!-- For UI changes: before / after. -->

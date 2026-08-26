# Aqua foundation. See docs/FOUNDATION.md for the only implemented scope.

.PHONY: setup doctor capabilities bot-run front-dev test test-foundation test-console tape fmt fmt-fix lint check docs-check secrets-check ci help

help:
	@echo "Aqua: Rust safety kernel + shadow operator console. Not a live bot."
	@echo "  doctor           validate fail-closed boot config; no network or signing"
	@echo "  capabilities     print the closed capability/transport surface and oracle gating"
	@echo "  test             Rust foundation tests + console kernel tests"
	@echo "  test-foundation  Rust workspace tests --locked"
	@echo "  test-console     frontend kernel tests (generated data, no RPC)"
	@echo "  fmt              check formatting;  fmt-fix applies it"
	@echo "  lint             clippy with -D warnings"
	@echo "  docs-check       relative links, status banners, retired config names"
	@echo "  secrets-check    committed env/key/credential scan"
	@echo "  ci               rust/docs/secrets gates (offline). Console is a separate job."
	@echo "  front-dev        shadow console on generated data"
	@echo "  setup            npm install in frontend/"
	@echo "  bot-run tape     intentionally unavailable"
	@echo "See docs/FOUNDATION.md and docs/BUILD_NOW.md."

doctor:
	@cd bot && cargo run -p aqua -- doctor

capabilities:
	@cd bot && cargo run -p aqua -- capabilities

test-foundation:
	@cd bot && cargo test --workspace --locked

test-console:
	@cd frontend && npm test

test: test-foundation test-console

fmt:
	@cd bot && cargo fmt --all --check

fmt-fix:
	@cd bot && cargo fmt --all

lint:
	@cd bot && cargo clippy --workspace --all-targets --locked -- -D warnings

docs-check:
	@python3 scripts/check_docs.py

secrets-check:
	@./scripts/check-secrets.sh

# Mirrors the rust/docs/secrets CI jobs. Frontend is a separate GitHub job.
check ci: fmt lint test-foundation docs-check secrets-check
	@echo "all offline gates passed"

setup:
	@cd frontend && npm install

front-dev:
	@cd frontend && npm run dev

bot-run tape:
	@echo "not implemented: $@ — read docs/FOUNDATION.md and docs/BUILD_NOW.md" >&2; exit 1

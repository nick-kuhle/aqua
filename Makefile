# Aqua foundation. See docs/FOUNDATION.md for the only implemented scope.

.PHONY: setup doctor capabilities bot-run front-dev test test-foundation tape fmt fmt-fix lint check docs-check secrets-check ci help

help:
	@echo "Aqua is foundation-only: config/risk/transport/capability kernel + config-only CLI."
	@echo "  doctor           validate fail-closed boot config; no network or signing"
	@echo "  capabilities     print the closed capability/transport surface and oracle gating"
	@echo "  test             run implemented Rust foundation tests"
	@echo "  fmt              check formatting;  fmt-fix applies it"
	@echo "  lint             clippy with -D warnings"
	@echo "  docs-check       relative links, status banners, retired config names"
	@echo "  secrets-check    committed env/key/credential scan"
	@echo "  ci               everything CI runs, offline"
	@echo "  setup bot-run front-dev tape are intentionally unavailable"
	@echo "See docs/FOUNDATION.md and docs/BUILD_NOW.md."

doctor:
	@cd bot && cargo run -p aqua -- doctor

capabilities:
	@cd bot && cargo run -p aqua -- capabilities

test test-foundation:
	@cd bot && cargo test --workspace --locked

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

# Mirrors the CI job set. No network, no secret, no RPC.
check ci: fmt lint test docs-check secrets-check
	@echo "all offline gates passed"

setup bot-run front-dev tape:
	@echo "not implemented: $@ — read docs/FOUNDATION.md and docs/BUILD_NOW.md" >&2; exit 1

# Aqua foundation. See docs/FOUNDATION.md for the only implemented scope.

.PHONY: setup doctor bot-run front-dev test test-foundation tape fmt help

help:
	@echo "Aqua is foundation-only: config/risk kernel + config-only doctor."
	@echo "  doctor           validate fail-closed boot config; no network or signing"
	@echo "  test             run implemented Rust foundation tests"
	@echo "  fmt              format/check the implemented Rust foundation"
	@echo "  setup bot-run front-dev tape are intentionally unavailable"
	@echo "See docs/FOUNDATION.md and docs/BUILD_NOW.md."

doctor:
	@cd bot && cargo run -p aqua -- doctor

test test-foundation:
	@cd bot && cargo test --workspace

fmt:
	@cd bot && cargo fmt --check

setup bot-run front-dev tape:
	@echo "not implemented: $@ — read docs/FOUNDATION.md and docs/BUILD_NOW.md" >&2; exit 1

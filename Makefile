# Aqua. Implementation lands under bot/, contracts/, frontend/.
# Until then these targets fail loudly so nobody thinks a doc repo is a binary.

.PHONY: setup doctor bot-run front-dev test tape fmt help

help:
	@echo "Aqua is specified in docs/. Implement, then wire these targets."
	@echo "  setup      submodules + frontend deps + .env"
	@echo "  doctor     aqua doctor"
	@echo "  bot-run    engine + API"
	@echo "  front-dev  console"
	@echo "  test       cargo test --all && forge test"
	@echo "  tape       optimizer vs naive"
	@echo "  fmt        rustfmt + forge fmt"
	@echo "See docs/SETUP.md and docs/BUILD_NOW.md."

setup doctor bot-run front-dev test tape fmt:
	@echo "not implemented: $@ — read docs/BUILD_NOW.md" >&2; exit 1

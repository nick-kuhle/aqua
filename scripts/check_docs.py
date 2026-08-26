#!/usr/bin/env python3
"""Documentation gates for Aqua. No network access.

Checks:
  1. Every relative markdown link resolves to a file in the repo.
  2. Every doc in docs/ carries a status banner, so no page can be mistaken
     for an implementation claim.
  3. Retired / forbidden configuration names do not reappear outside the
     places that explicitly document them as retired.
  4. The forbidden-strategy exclusions are still stated in the product docs.
"""

from __future__ import annotations

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

LINK = re.compile(r"\]\(([^)\s]+?)\)")

# Docs exempt from the status banner: the ledger itself, the index, the
# research brief and the work order carry their own dated status lines.
BANNER_EXEMPT = {
    "docs/README.md",
    "docs/FOUNDATION.md",
    "docs/RESEARCH_2026.md",
    "docs/CURRENT_STATE_2026.md",
    "docs/AQUA_WORK_ORDER.md",
    "docs/ALLOY.md",
    "docs/PROTOCOL_REGISTRY.md",
    "docs/CONTRIBUTING.md",
}

# Retired/forbidden names. These may be *named* anywhere (docs must be able to
# say "this is forbidden"); what is banned is using one as a live assignment,
# i.e. `NAME=value` or `NAME: value`, outside the files that document them.
RETIRED = {
    "SUBMISSION_MODE": {"docs/CONFIG.md", "scripts/check_docs.py"},
    "MIN_NET_PROFIT_ETH": {"docs/CONFIG.md", "scripts/check_docs.py"},
    "MAX_BASE_FEE_GWEI": {"docs/CONFIG.md", "scripts/check_docs.py"},
    "MAX_DRAWDOWN_ETH": {"docs/CONFIG.md", "scripts/check_docs.py"},
    "BUILDER_SHARE_BPS": {"docs/CONFIG.md", "scripts/check_docs.py"},
}

EXCLUSIONS = ["sandwich", "JIT", "sniper", "Solana"]

errors: list[str] = []


def tracked_files(exts: tuple[str, ...]) -> list[str]:
    out = []
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in {".git", "target", "node_modules"}]
        for f in files:
            if f.endswith(exts):
                out.append(os.path.relpath(os.path.join(base, f), ROOT))
    return sorted(out)


def check_links() -> None:
    for rel in tracked_files((".md",)):
        text = open(os.path.join(ROOT, rel), encoding="utf-8").read()
        for target in LINK.findall(text):
            if target.startswith(("http://", "https://", "mailto:", "#")):
                continue
            path = target.split("#", 1)[0]
            if not path:
                continue
            resolved = os.path.normpath(os.path.join(os.path.dirname(rel), path))
            if not os.path.exists(os.path.join(ROOT, resolved)):
                errors.append(f"{rel}: broken relative link -> {target}")


def check_banners() -> None:
    for rel in tracked_files((".md",)):
        if not rel.startswith("docs/") or rel in BANNER_EXEMPT:
            continue
        head = "\n".join(
            open(os.path.join(ROOT, rel), encoding="utf-8").read().splitlines()[:8]
        )
        if "**Status:" not in head:
            errors.append(f"{rel}: missing a '**Status:' banner in the first 8 lines")


def check_retired() -> None:
    for rel in tracked_files((".md", ".rs", ".toml", ".yml", ".yaml", ".sh", ".py")) + [
        ".env.example",
        ".env.example.base",
        ".env.example.bnb",
    ]:
        full = os.path.join(ROOT, rel)
        if not os.path.exists(full):
            continue
        try:
            text = open(full, encoding="utf-8").read()
        except (UnicodeDecodeError, IsADirectoryError):
            continue
        for name, allowed in RETIRED.items():
            if rel in allowed:
                continue
            # Only an actual assignment is a violation, not a mention.
            if re.search(rf"^\s*{name}\s*[=:]", text, re.MULTILINE):
                errors.append(
                    f"{rel}: retired configuration name '{name}' used as an assignment"
                )


def check_exclusions() -> None:
    text = open(os.path.join(ROOT, "README.md"), encoding="utf-8").read()
    text += open(os.path.join(ROOT, "docs", "STRATEGIES.md"), encoding="utf-8").read()
    for word in EXCLUSIONS:
        if word.lower() not in text.lower():
            errors.append(f"product exclusion '{word}' is no longer stated in the docs")


def main() -> int:
    check_links()
    check_banners()
    check_retired()
    check_exclusions()
    if errors:
        print("DOC CHECK FAILED\n")
        for e in errors:
            print(f"  - {e}")
        return 1
    print("doc check: clean")
    return 0


if __name__ == "__main__":
    sys.exit(main())

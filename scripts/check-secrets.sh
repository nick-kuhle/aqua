#!/usr/bin/env bash
# Fail closed on committed secrets, env files, or key material.
# No network. Runs over tracked files only.
set -euo pipefail

cd "$(dirname "$0")/.."
fail=0

note() { echo "SECRET-SCAN FAIL: $*" >&2; fail=1; }

# 1. No committed .env (allow .env.example*).
while IFS= read -r f; do
  case "$f" in
    *.env.example|*.env.example.*|.env.example|.env.example.*) continue ;;
  esac
  note "environment file committed: $f"
done < <(git ls-files | grep -E '(^|/)\.env($|\.)' || true)

# 2. No PEM/keystore/wallet artifacts.
while IFS= read -r f; do
  note "key material committed: $f"
done < <(git ls-files | grep -Ei '\.(pem|p12|pfx|keystore|jks)$|(^|/)id_(rsa|ed25519)$|(^|/)keystore/' || true)

# 3. No literal private keys or credential-shaped strings in tracked text.
#    Patterns are deliberately narrow to avoid false positives on docs.
patterns=(
  '0x[0-9a-fA-F]{64}'                    # 32-byte hex literal (private key shape)
  '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  'PRIVATE_KEY[[:space:]]*=[[:space:]]*[^[:space:]#]'
  'API_AUTH_TOKEN[[:space:]]*=[[:space:]]*[^[:space:]#]'
  '(https?://)[^[:space:]/]*:[^[:space:]@/]+@'   # credentials in a URL
  'wss?://[^[:space:]]*[?&](apikey|api_key|key|token)='
)
for p in "${patterns[@]}"; do
  while IFS= read -r hit; do
    note "possible credential: $hit"
  done < <(git grep -nIE -e "$p" -- \
      ':(exclude)scripts/check-secrets.sh' \
      ':(exclude)*.lock' || true)
done

if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "Secrets must never be committed. See docs/CONFIG.md and AGENTS.md." >&2
  exit 1
fi

echo "secret scan: clean"

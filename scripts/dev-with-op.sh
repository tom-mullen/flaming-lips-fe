#!/usr/bin/env bash
# Run `npm run dev` with secrets injected from your own 1Password vault.
#
# Requires:
#   - `op` CLI (https://developer.1password.com/docs/cli/)
#   - A 1Password item named `flaming-lips-fe` with these fields:
#       AUTH_SECRET, CLIENT_ID, CLIENT_SECRET,
#       NEXT_PUBLIC_API_URL, AUTH_URL
#   - A .env.op.local file in the repo root with OP_ACCOUNT and OP_VAULT set
#     (see .env.op.local.example).

set -euo pipefail

cd "$(dirname "$0")/.."

LOCAL_CONFIG=".env.op.local"

if [[ ! -f "$LOCAL_CONFIG" ]]; then
  cat >&2 <<EOF
Missing $LOCAL_CONFIG.

Create it based on .env.op.local.example:

  cp .env.op.local.example $LOCAL_CONFIG

Then set OP_ACCOUNT and OP_VAULT inside.
EOF
  exit 1
fi

# Load per-dev config
set -a
# shellcheck source=/dev/null
source "$LOCAL_CONFIG"
set +a

missing=()
[[ -z "${OP_ACCOUNT:-}" ]] && missing+=("OP_ACCOUNT")
[[ -z "${OP_VAULT:-}" ]] && missing+=("OP_VAULT")

if (( ${#missing[@]} > 0 )); then
  echo "Missing required vars in $LOCAL_CONFIG: ${missing[*]}" >&2
  exit 1
fi

if ! command -v op >/dev/null 2>&1; then
  echo "1Password CLI (op) not found. Install: https://developer.1password.com/docs/cli/" >&2
  exit 1
fi

# Substitute $OP_VAULT into .env.op, then hand the rendered env file to op run.
# Process substitution avoids a temp file.
exec op run \
  --account "$OP_ACCOUNT" \
  --env-file=<(sed "s|\$OP_VAULT|$OP_VAULT|g" .env.op) \
  -- npm run dev

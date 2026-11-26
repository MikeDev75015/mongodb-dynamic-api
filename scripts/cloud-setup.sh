#!/usr/bin/env bash
# cloud-setup.sh — SessionStart hook for Claude Code cloud sessions (claude.ai/code).
#
# Wired in .claude/settings.json. No-op everywhere except a Claude Code cloud session
# (CLAUDE_CODE_REMOTE=true), so local sessions (Windows + Docker Desktop) are untouched.
#
# 1. Installs dependencies (npm ci) when node_modules is missing.
# 2. Starts a Docker-free MongoDB replica set for the e2e suite (scripts/cloud-mongo.cjs).
# 3. Exports MONGO_DB_URL to every later Bash call of the session (via CLAUDE_ENV_FILE) and
#    writes it to .env (gitignored; the e2e specs load it through `dotenv/config`).
#
# Never fails the session: if MongoDB can't start (e.g. fastdl.mongodb.org blocked by the
# environment's network policy), it warns and unit tests stay usable.

set -u

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}" || exit 0

if [ ! -d node_modules ]; then
  echo "[cloud-setup] npm ci..."
  npm ci --no-audit --no-fund || { echo "[cloud-setup] WARNING: npm ci failed"; exit 0; }
fi

export MDA_MONGO_URI_FILE="${MDA_MONGO_URI_FILE:-/tmp/mda-mongo-uri}"
LOG_FILE=/tmp/mda-cloud-mongo.log

nohup node scripts/cloud-mongo.cjs > "$LOG_FILE" 2>&1 &

# First run downloads the mongod binary (~100 MB): allow up to 3 minutes.
for _ in $(seq 1 180); do
  if [ -s "$MDA_MONGO_URI_FILE" ]; then
    break
  fi
  sleep 1
done

if [ ! -s "$MDA_MONGO_URI_FILE" ]; then
  echo "[cloud-setup] WARNING: MongoDB not ready, e2e tests unavailable. Log: $LOG_FILE"
  tail -n 20 "$LOG_FILE" 2>/dev/null
  exit 0
fi

MONGO_DB_URL="$(tr -d '\n' < "$MDA_MONGO_URI_FILE")"

if [ -n "${CLAUDE_ENV_FILE:-}" ]; then
  echo "export MONGO_DB_URL='${MONGO_DB_URL}'" >> "$CLAUDE_ENV_FILE"
fi

if [ ! -f .env ] || ! grep -q '^MONGO_DB_URL=' .env; then
  echo "MONGO_DB_URL=${MONGO_DB_URL}" >> .env
fi

echo "[cloud-setup] MongoDB replica set ready: ${MONGO_DB_URL}"
exit 0

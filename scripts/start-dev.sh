#!/usr/bin/env bash
# Start (or restart) a local static dev server on a free port.
# Usage: ./scripts/start-dev.sh [port]   (default 8000)
#
# Handles:
# - old server stuck on the port (kills it)
# - port already in use (auto-picks next free)
# - binds to 0.0.0.0 so both localhost and 127.0.0.1 work

set -u

PORT="${1:-8000}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT" || exit 1

free_port() {
  local p="$1"
  while lsof -ti:"$p" >/dev/null 2>&1; do
    p=$((p + 1))
  done
  echo "$p"
}

if lsof -ti:"$PORT" >/dev/null 2>&1; then
  echo "[dev] killing process on port $PORT"
  lsof -ti:"$PORT" | xargs -r kill -9 || true
  sleep 1
fi

PORT="$(free_port "$PORT")"

echo "[dev] serving $ROOT on http://127.0.0.1:$PORT"
echo "[dev] Ctrl+C to stop"
exec python3 -m http.server "$PORT" --bind 0.0.0.0

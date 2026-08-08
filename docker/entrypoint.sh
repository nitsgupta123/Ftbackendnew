#!/bin/sh
set -e

if [ "${SKIP_DB_INIT:-false}" != "true" ]; then
  echo "[entrypoint] Running database init..."
  node scripts/init-db.mjs
else
  echo "[entrypoint] Skipping database init (SKIP_DB_INIT=true)"
fi

echo "[entrypoint] Starting app..."
exec "$@"

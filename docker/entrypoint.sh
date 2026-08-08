#!/bin/sh
set -e

echo "[entrypoint] Running database init..."
node scripts/init-db.mjs

echo "[entrypoint] Starting app..."
exec "$@"
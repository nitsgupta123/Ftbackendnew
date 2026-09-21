#!/bin/sh
set -e

if [ "${SKIP_DB_INIT:-false}" != "true" ]; then
  echo "[entrypoint] Running database init..."
  node scripts/init-db.mjs
else
  echo "[entrypoint] Skipping database init (SKIP_DB_INIT=true)"
fi

# Safe/idempotent — do not crash the container if MySQL is briefly unavailable
if [ "${SKIP_EMAIL_VERIFICATION_MIGRATE:-false}" != "true" ]; then
  echo "[entrypoint] Ensuring email verification columns on tbl_user..."
  if ! node scripts/run-migrate-email-verification.mjs; then
    echo "[entrypoint] WARN: email verification migrate failed — continuing startup"
  fi
fi

echo "[entrypoint] Starting app..."
exec "$@"

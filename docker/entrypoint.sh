#!/bin/sh
set -e

echo "[entrypoint] Waiting for PostgreSQL..."
# Retry up to 30 times (1s each) for DB to be ready
for i in $(seq 1 30); do
  if node -e "
    const { Client } = require('pg');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    client.connect().then(() => { client.end(); process.exit(0); }).catch(() => process.exit(1));
  " 2>/dev/null; then
    echo "[entrypoint] PostgreSQL ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "[entrypoint] WARNING: PostgreSQL not reachable after 30s, starting anyway..."
  fi
  sleep 1
done

echo "[entrypoint] Starting VidCraft backend..."
exec node dist/main

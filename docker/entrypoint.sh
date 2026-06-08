#!/bin/sh
echo "[entrypoint] VidCraft backend container starting..."
echo "[entrypoint] DATABASE_URL host: $(echo "$DATABASE_URL" | sed 's/.*@//' | sed 's/\/.*//')"

# Wait for PostgreSQL to be ready (up to 30s)
echo "[entrypoint] Waiting for PostgreSQL..."
for i in $(seq 1 30); do
  if node -e "
    const { Client } = require('pg');
    const url = process.env.DATABASE_URL;
    if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }
    const client = new Client({ connectionString: url, connectionTimeoutMillis: 5000 });
    client.connect().then(() => { console.log('pg connected'); client.end(); process.exit(0); }).catch((e) => { console.error('pg connect failed: ' + e.message); process.exit(1); });
  "; then
    echo "[entrypoint] PostgreSQL ready (attempt $i)"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[entrypoint] WARNING: PostgreSQL not reachable after 30s, starting anyway..."
  fi
  sleep 1
done

echo "[entrypoint] Starting VidCraft backend..."
exec node dist/main

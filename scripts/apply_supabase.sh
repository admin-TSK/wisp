#!/usr/bin/env bash
# Apply Wisp schema + seed to a Supabase database.
#
# Option A (Supabase MCP, when reachable): use the apply_migration / execute_sql
# tools with the contents of supabase/migrations/*.sql and supabase/seed.sql.
#
# Option B (psql / CLI): point DATABASE_URL at your project and run this script.
set -euo pipefail

: "${DATABASE_URL:?Set DATABASE_URL to your Supabase Postgres connection string}"

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Applying migrations..."
for f in "$DIR"/supabase/migrations/*.sql; do
  echo "  -> $(basename "$f")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
done

echo "Seeding model_pricing rate card..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$DIR/supabase/seed.sql"

echo "Done. Wisp schema + rate card applied."

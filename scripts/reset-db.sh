#!/usr/bin/env bash
set -euo pipefail

DB_URL=${1:-postgresql://cs2suite:cs2suite@localhost:5432/cs2suite}

psql "$DB_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql "$DB_URL" -f backend/migrations/001_init.sql

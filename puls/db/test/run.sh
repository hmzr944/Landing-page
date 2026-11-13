#!/usr/bin/env bash
# Rejoue les migrations PULS sur une base PostgreSQL jetable puis lance les tests d'isolation.
# Usage : puls/db/test/run.sh   (nécessite psql et un PostgreSQL local accessible par l'utilisateur postgres)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DB="puls_test_$$"
PSQL=(psql -X -q -v ON_ERROR_STOP=1)
run() { if [ "$(id -un)" = "postgres" ]; then "$@"; else su postgres -c "$(printf '%q ' "$@")"; fi; }
run createdb "$DB"
trap 'run dropdb --if-exists "$DB" >/dev/null 2>&1 || true' EXIT
run "${PSQL[@]}" -d "$DB" -f "$DIR/supabase_stub.sql"
for f in "$DIR"/../migrations/*.sql; do
  echo "migration $(basename "$f")"
  run "${PSQL[@]}" -d "$DB" -f "$f"
done
run "${PSQL[@]}" -d "$DB" -f "$DIR/isolation_test.sql"

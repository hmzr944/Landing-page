#!/usr/bin/env bash
# Regroupe les migrations dans setup.sql : un seul fichier à coller dans l'éditeur SQL de Supabase.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
{
  echo "-- ====================================================================="
  echo "-- PULS : installation complète de la base (migrations 001 à 003 regroupées)"
  echo "-- À exécuter UNE SEULE FOIS sur un projet Supabase vierge :"
  echo "--   Supabase > SQL Editor > New query > coller tout ce fichier > Run"
  echo "-- Fichier généré par db/build-setup.sh : ne pas modifier à la main."
  echo "-- ====================================================================="
  for f in "$DIR"/migrations/*.sql; do
    echo; echo "-- >>>>> $(basename "$f")"; cat "$f"
  done
} > "$DIR/setup.sql"
echo "setup.sql : $(wc -l < "$DIR/setup.sql") lignes"

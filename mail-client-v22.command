#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLIENT_DIR="$ROOT_DIR/mail-client-v22"

if [[ ! -d "$CLIENT_DIR" ]]; then
  echo "Erreur: dossier introuvable: $CLIENT_DIR"
  exit 1
fi

cd "$CLIENT_DIR"

(
  sleep 2
  open "http://127.0.0.1:8000"
) >/dev/null 2>&1 &

exec ./start.sh

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v git >/dev/null || { echo "Erreur : git est manquant."; exit 1; }
command -v python3 >/dev/null || { echo "Erreur : python3 est manquant."; exit 1; }
git fetch origin '+refs/heads/archive/*:refs/heads/archive/*' >/dev/null 2>&1 || true
export TESTER_OPEN=1
exec python3 tools/tester-server.py

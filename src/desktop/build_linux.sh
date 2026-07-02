#!/usr/bin/env bash
# Build SimpleMail Linux binary via PyInstaller + pywebview.
# Requires: python3, python3-pip, python3-venv, libwebkit2gtk-4.0-dev
# Install deps:
#   sudo apt install python3 python3-pip python3-venv libwebkit2gtk-4.0-dev
#   python3 -m pip install --user -r "$(dirname "$0")"/build-requirements.txt
# Output: <repo>/releases/linux/SimpleMail
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE"
REPO="$(cd "$HERE/../.." && pwd)"
OUT="$REPO/releases/linux"
WORK="$HERE/build"
SPEC="$HERE/build"

mkdir -p "$OUT" "$WORK"

cd "$SRC"

echo "→ Building SimpleMail (Linux) …"
python3 -m PyInstaller \
  --noconfirm --clean --windowed \
  --name "SimpleMail" \
  --distpath "$OUT" --workpath "$WORK" --specpath "$SPEC" \
  --add-data "$SRC/index.html:." \
  --add-data "$SRC/config.example.json:." \
  --add-data "$SRC/bg.jpg:." \
  --add-data "$SRC/icon.png:." \
  --collect-all uvicorn --collect-all fastapi --collect-all starlette --collect-all pydantic \
  --hidden-import "webview.platforms.gtk" \
  app.py

echo ""
echo "✓ Built: $OUT/SimpleMail"
du -sh "$OUT/SimpleMail" 2>/dev/null || true

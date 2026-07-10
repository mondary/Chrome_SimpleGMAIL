#!/usr/bin/env bash
# Build the SimpleMail macOS .app via PyInstaller + pywebview.
# Output: <repo>/releases/macos/SimpleMail-<version>.app
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"            # src/desktop
SRC="$HERE"
REPO="$(cd "$HERE/../.." && pwd)"
OUT="$REPO/releases/macos"
WORK="$HERE/build"
SPEC="$HERE/build"
VERSION="$(tr -d '[:space:]' < "$SRC/VERSION")"
APP_NAME="SimpleMail-$VERSION"

mkdir -p "$OUT" "$WORK"

cd "$SRC"

# --- Build an .icns from icon.png (macOS app icon) ---
ICONSET="$WORK/icon.iconset"
rm -rf "$ICONSET"; mkdir -p "$ICONSET"
for sz in 16 32 64 128 256 512; do
  sips -z $sz $sz "$SRC/icon.png" --out "$ICONSET/icon_${sz}x${sz}.png" >/dev/null 2>&1 || true
done
for sz in 32 64 256 512; do
  d=$((sz*2)); sips -z $d $d "$SRC/icon.png" --out "$ICONSET/icon_${sz}x${sz}@2x.png" >/dev/null 2>&1 || true
done
ICON_ICNS="$WORK/icon.icns"
iconutil -c icns "$ICONSET" -o "$ICON_ICNS" >/dev/null 2>&1 || ICON_ICNS="$SRC/icon.png"

echo "→ Building $APP_NAME.app (this can take 1-2 min)…"
python3 -m PyInstaller \
  --noconfirm --clean --windowed \
  --name "$APP_NAME" \
  --icon "$ICON_ICNS" \
  --distpath "$OUT" --workpath "$WORK" --specpath "$SPEC" \
  --add-data "$SRC/index.html:." \
  --add-data "$SRC/config.example.json:." \
  --add-data "$SRC/bg.jpg:." \
  --add-data "$SRC/icon.png:." \
  --add-data "$SRC/VERSION:." \
  --collect-all uvicorn --collect-all fastapi --collect-all starlette --collect-all pydantic \
  --hidden-import "webview.platforms.cocoa" \
  app.py

echo ""
echo "✓ Built: $OUT/$APP_NAME.app"
du -sh "$OUT/$APP_NAME.app" 2>/dev/null || true

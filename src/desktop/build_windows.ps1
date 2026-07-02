<#
.SYNOPSIS
  Build SimpleMail Windows executable via PyInstaller + pywebview.
.OUTPUTS
  <repo>\releases\windows\SimpleMail\
#>
$ErrorActionPreference = "Stop"

$HERE = Split-Path -Parent $MyInvocation.MyCommand.Path
$SRC = $HERE
$REPO = Resolve-Path "$HERE\..\.."
$OUT = "$REPO\releases\windows"
$WORK = "$HERE\build"
$SPEC = "$HERE\build"

New-Item -ItemType Directory -Force -Path $OUT, $WORK | Out-Null
Set-Location $SRC

Write-Host "Building SimpleMail.exe ..."

python -m PyInstaller --noconfirm --clean --windowed `
  --name "SimpleMail" `
  --icon "$SRC\icon.png" `
  --distpath "$OUT" --workpath "$WORK" --specpath "$SPEC" `
  "--add-data" "$SRC\index.html;." `
  "--add-data" "$SRC\config.example.json;." `
  "--add-data" "$SRC\bg.jpg;." `
  "--add-data" "$SRC\icon.png;." `
  "--collect-all" "uvicorn" `
  "--collect-all" "fastapi" `
  "--collect-all" "starlette" `
  "--collect-all" "pydantic" `
  "--hidden-import" "webview.platforms.edgechromium" `
  app.py

if ($LASTEXITCODE -ne 0) { throw "PyInstaller failed" }

Write-Host "`nOK  $OUT\SimpleMail\"

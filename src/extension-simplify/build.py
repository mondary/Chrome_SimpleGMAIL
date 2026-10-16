#!/usr/bin/env python3
"""Package only the unpacked extension runtime, with no dependencies."""
import json
from pathlib import Path
from shutil import copyfile
from zipfile import ZIP_DEFLATED, ZipFile

root = Path(__file__).resolve().parent
project_license = root.parent.parent / "LICENSE"
store = project_license.parent / "store"
manifest = json.loads((root / "manifest.json").read_text())
runtime = ["manifest.json", "gmail.css", "settings.js", "content.js",
           "popup.html", "popup.css", "popup.js", "README.md", "PRIVACY.md"]
runtime += [f"icons/{size}.png" for size in (16, 32, 48, 128)]
runtime += ["backgrounds/ocean.jpg", "backgrounds/night.jpg", "backgrounds/CREDITS.md"]
for name in runtime:
    if not (root / name).is_file():
        raise SystemExit(f"Missing runtime file: {name}")
out = root / "dist" / f"pk-gmail-simplify-style-{manifest['version']}.zip"
out.parent.mkdir(exist_ok=True)
with ZipFile(out, "w", compression=ZIP_DEFLATED) as archive:
    for name in runtime:
        archive.write(root / name, name)
    archive.write(project_license, "LICENSE")
print(out)
if (store / "index.html").is_file():
    assets = store / "assets"
    assets.mkdir(parents=True, exist_ok=True)
    store_zip = assets / out.name
    copyfile(out, store_zip)
    copyfile(root / "icons/32.png", assets / "icon-32.png")
    print(store_zip)

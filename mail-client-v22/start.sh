#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

secrets_file="$PWD/secrets/mail.env"
if [[ -f "$secrets_file" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" ]] && continue
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^[[:space:]]*([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]] || continue
    key="${BASH_REMATCH[1]}"
    value="${BASH_REMATCH[2]}"
    value="${value%$'\r'}"
    [[ -n "${!key:-}" ]] || export "$key=$value"
  done < "$secrets_file"
fi

configured_accounts="$(
python3 - <<'PY'
import json, os, pathlib, re
cfg = json.loads(pathlib.Path("config.json").read_text(encoding="utf-8"))
count = 0
for account in cfg.get("accounts", []):
    ok = True
    for section in ("imap", "smtp"):
        for value in account.get(section, {}).values():
            if isinstance(value, str):
                matches = re.findall(r"\$\{([^}]+)\}", value)
                if matches:
                    for match in matches:
                        raw = os.environ.get(match, "")
                        if not raw or "MOT_DE_PASSE" in raw or raw == "LE_MOT_DE_PASSE_DU_COMPTE_EMAIL":
                            ok = False
                elif "MOT_DE_PASSE" in value or value == "LE_MOT_DE_PASSE_DU_COMPTE_EMAIL":
                    ok = False
    if ok:
        count += 1
print(count)
PY
)"

if [[ "$configured_accounts" -le 0 ]]; then
  echo "Erreur: aucun compte mail valide n'est configuré."
  echo "Renseigne au moins une variable de mot de passe dans secrets/mail.env."
  exit 1
fi

python3 main.py

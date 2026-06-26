#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if [[ -z "${POUARK_MAIL_PASSWORD:-}" && -z "${MONDARY_MAIL_PASSWORD:-}" ]]; then
  echo "Erreur: définis au moins un mot de passe mail."
  echo "Exemples:"
  echo "  export MONDARY_MAIL_PASSWORD='mot-de-passe-clement@mondary.design'"
  echo "  export POUARK_MAIL_PASSWORD='mot-de-passe-c@pouark.com'"
  exit 1
fi

for var_name in POUARK_MAIL_PASSWORD MONDARY_MAIL_PASSWORD; do
  value="${!var_name:-}"
  if [[ "${value}" == *"MOT_DE_PASSE"* || "${value}" == "LE_MOT_DE_PASSE_DU_COMPTE_EMAIL" ]]; then
    echo "Erreur: ${var_name} contient encore le placeholder, pas le vrai mot de passe."
    exit 1
  fi
done

python3 main.py

#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

secrets_file="$PWD/secrets/mail.env"
if [[ -f "$secrets_file" ]]; then
  while IFS='=' read -r key value; do
    case "$key" in
      MONDARY_MAIL_PASSWORD)
        [[ -n "${MONDARY_MAIL_PASSWORD:-}" ]] || export MONDARY_MAIL_PASSWORD="$value"
        ;;
      POUARK_MAIL_PASSWORD)
        [[ -n "${POUARK_MAIL_PASSWORD:-}" ]] || export POUARK_MAIL_PASSWORD="$value"
        ;;
    esac
  done < "$secrets_file"
fi

if [[ -z "${MONDARY_MAIL_PASSWORD:-}" && -z "${POUARK_MAIL_PASSWORD:-}" ]]; then
  echo "Erreur: aucun mot de passe mail configuré."
  echo "Ajoutez MONDARY_MAIL_PASSWORD= ou POUARK_MAIL_PASSWORD= dans secrets/mail.env."
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

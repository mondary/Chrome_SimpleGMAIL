#!/usr/bin/env bash
# PK Gmail Scripts Lab — build
# Régénère tweaks/, scripts/ et data/manifest.js depuis :
#   - gmail.css (source de vérité CSS)  : sources/gmail.css (absorbé de l'ancienne extension SimpleMail)
#   - snippets ScriptCat (scripts JS)   : vendors/scriptcat-snippets (symlink)
set -euo pipefail
cd "$(dirname "$0")"

SG_ROOT="$(cd ../.. && pwd)"                      # Chrome_SimpleGMAIL
SNIPPETS="$SG_ROOT/vendors/scriptcat-snippets"    # symlink vendors → snippets ScriptCat

if [ ! -d "$SNIPPETS" ]; then
  echo "ERREUR: symlink vendors/scriptcat-snippets absent — lance depuis le repo mergé." >&2
  exit 1
fi

python3 - "$SG_ROOT/src/extension-pk/sources/gmail.css" "$SNIPPETS" << 'PYEOF'
import re, sys, os

gmail_css, snippets = sys.argv[1], sys.argv[2]
os.makedirs("tweaks", exist_ok=True)
os.makedirs("scripts", exist_ok=True)
os.makedirs("data", exist_ok=True)

BENCH_VERSION = "2026.10.56"

# ---- 1. Découpage gmail.css en tweaks
text = open(gmail_css, encoding="utf-8").read()
parts = re.split(r"/\*\s*(\d+)\)\s*([^*]+)\*/", text)
sections = {}
for i in range(1, len(parts) - 2, 3):
    sections[int(parts[i])] = (parts[i + 1].strip(), parts[i + 2].strip())

# id, label, statut (ok = validé / ko = à retester)
CSS_DEFS = {
    1: ("background-white", "BackgroundWhite · fond blanc + police fine", "ok"),
    2: ("searchbar", "SearchBar · recherche centrée blanche", "ok"),
    3: ("sticky-topic", "StickyTopic · sujet épinglé en haut", "ok"),
    4: ("stars-focus", "StarsFocus · ligne étoilée surlignée (jaune)", "ok"),
    5: ("margin", "Margin · colonne centrée (marges en %)", "ok"),
    6: ("unread-color", "UnreadColor · non-lus gris", "ok"),
    7: ("top-right", "TopRight v2 · aide/apps/notifications masqués", "ok"),
    8: ("no-left-menu", "NoLeftMenu · menu latéral masqué", "ok"),
    9: ("white-style", "WhiteStyle · padding des lignes", "ok"),
    10: ("scrollbar-grey", "ScrollBarGrey · scrollbar fine grise", "ok"),
    11: ("theme-pkweb", "Theme · PK Web Memory (à alléger — trop de bordures)", "ko"),
    12: ("status-pill", "Statut · masquer Actif/absent (à côté des réglages)", "ok"),
    13: ("header-autohide", "Header auto-hide v4 · header effacé au scroll (mise en page stable)", "ko"),
    14: ("grayscale-bar", "Barre supérieure en niveaux de gris", "ok"),
    15: ("compose-toolbar", "Masquer outils de saisie (v3 : Envoyer préservé)", "ok"),
    16: ("reading-pane-btn", "Masquer volet de lecture (v3 : Envoyer préservé)", "ok"),
    17: ("toast-center", "Toast redesign · centré bas, pilule sombre (Annuler cliquable)", "new"),
    18: ("sidebar-composer", "Sidebar · Nouveau message à la largeur des dossiers", "new"),
    19: ("sidebar-gray", "Sidebar · niveaux de gris (libellés préservés)", "new"),
}
css_items = []
for num, (fid, label, status) in CSS_DEFS.items():
    if num not in sections:
        print(f"  ! section {num} absente de gmail.css, ignorée")
        continue
    titre, contenu = sections[num]
    fname = f"tweaks/{fid}.css"
    with open(fname, "w", encoding="utf-8") as f:
        f.write(f"/* {num}) {titre} — généré depuis gmail.css */\n{contenu.strip()}\n")
    css_items.append({"id": f"css-{fid}", "group": "css", "label": label,
                      "file": fname, "type": "css", "version": BENCH_VERSION,
                      "status": status})
    if fid == "margin":
        css_items[-1]["setting"] = "margin-pct"
    print(f"  ✓ {fname}")

# ---- 2. Scripts fonctionnels (src, id, label, version, statut)
JS_DEFS = [
    ("pk-gmail-keyword-highlighter.user.js", "js-keyword-highlighter", "Keyword Highlighter", "0.4.0", "ok"),
    ("pk-gmail-filter-similar-always-visible.user.js", "js-filter-similar", "Filter Similar · toujours visible (+Alt+Shift+F)", "1.33", "ok"),
    ("pk-gmail-no-spam-icon.user.js", "js-no-spam-icon", "No Spam Icon · coche verte zéro spam (fix v0.2)", "0.2", "ko"),
    ("pk-gmail-sender-icons.user.js", "js-sender-icons", "Sender Icons · favicons expéditeurs", "0.1", "ok"),
    ("pk-gmail-short-label-after-slash-only.user.js", "js-short-label", "Short Label · après slash", "0.1", "ok"),
    ("pk-gmail-custom-tabs.user.js", "js-custom-tabs", "Custom Tabs", "2.9", "ok"),
    ("pk-gmail-new-message-button.user.js", "js-new-message-button", "New Message Button · FAB liste seulement (au-dessus du HL)", "2.1", "ok"),
    ("pk-gmail-icon-view.user.js", "js-icon-view", "Icon View", "0.1", "ko"),
    ("pk-gmail-bouton-inbox-vue-liste-strict.user.js", "js-inbox-strict", "Bouton Inbox · vue liste stricte (à redéfinir)", "11.0", "ko"),
]
GM_SHIM = """// --- GM shim (banc de test, monde isolé) ---
if (typeof GM_getValue === 'undefined') {
  window.GM_getValue = (k, d) => { try { const v = localStorage.getItem('gm:' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
  window.GM_setValue = (k, v) => { try { localStorage.setItem('gm:' + k, JSON.stringify(v)); } catch (e) {} };
}
"""

js_items = []
for src, fid, label, ver, status in JS_DEFS:
    code = open(os.path.join(snippets, src), encoding="utf-8", errors="replace").read()
    needs_gm = "GM_getValue" in code or "GM_setValue" in code
    if needs_gm and "GM_getValue === 'undefined'" not in code:
        code = GM_SHIM + "\n" + code
    dst = f"scripts/{src}"
    with open(dst, "w", encoding="utf-8") as f:
        f.write(code)
    run_at = "document_start" if "@run-at       document-start" in code or "@run-at document-start" in code else "document_end"
    js_items.append({"id": fid, "group": "js", "label": label, "file": dst,
                     "type": "js", "version": ver,
                     "world": "ISOLATED" if needs_gm else "MAIN",
                     "runAt": run_at, "status": status})
    print(f"  ✓ {dst}" + (" (+shim GM)" if needs_gm else ""))

# ---- 3. Ordre d'affichage : indispensables d'abord, à retester ensuite
ALL = css_items + js_items
ALL.append({"id": "js-studio-empty", "group": "js", "label": "Boîte à zéro · état vide des catégories",
            "file": "themes/studio/empty-state.js", "css": ["themes/studio/empty-state.css"],
            "type": "js", "world": "ISOLATED", "runAt": "document_end",
            "version": BENCH_VERSION, "status": "new"})
ALL.append({"id": "js-studio-toast-undo", "group": "js", "label": "Toast · Annuler préservé (un nouveau toast ne le vole plus)",
            "file": "themes/studio/toast-undo.js",
            "type": "js", "world": "ISOLATED", "runAt": "document_end",
            "version": BENCH_VERSION, "status": "new"})
ORDER_OK = ["css-white-style", "css-background-white", "css-grayscale-bar", "css-scrollbar-grey",
            "js-keyword-highlighter", "js-filter-similar", "css-no-left-menu", "css-status-pill",
            "css-top-right", "js-sender-icons", "js-short-label", "css-unread-color",
            "css-searchbar", "css-sticky-topic", "css-stars-focus", "css-compose-toolbar",
            "css-reading-pane-btn", "css-margin", "js-new-message-button", "js-custom-tabs"]
ORDER_NEW = ["js-studio-empty", "js-studio-toast-undo", "css-toast-center", "css-sidebar-composer", "css-sidebar-gray"]
ORDER_KO = ["css-theme-pkweb", "css-header-autohide", "js-icon-view",
            "js-inbox-strict", "js-no-spam-icon"]

def safe_index(item_id, order):
    return order.index(item_id) if item_id in order else len(order)

ordered = sorted([i for i in ALL if i["status"] == "new"], key=lambda i: safe_index(i["id"], ORDER_NEW))
ordered += sorted([i for i in ALL if i["status"] == "ok"], key=lambda i: safe_index(i["id"], ORDER_OK))
ordered += sorted([i for i in ALL if i["status"] == "ko"], key=lambda i: safe_index(i["id"], ORDER_KO))
missing = [i["id"] for i in ALL if i not in ordered]
for mid in missing:
    ordered.append(next(i for i in ALL if i["id"] == mid))

# ---- 4. data/manifest.js
import json
with open("data/manifest.js", "w", encoding="utf-8") as f:
    f.write("// Généré par build.sh — ne pas éditer à la main\n")
    f.write("self.LAB_ITEMS = " + json.dumps(ordered, ensure_ascii=False, indent=2) + ";\n")
print(f"  ✓ data/manifest.js ({len(ordered)} items, v{BENCH_VERSION})")
PYEOF

# ---- 5. Icône : synchronisée depuis l'icône de l'app à la racine du dépôt
cp -f "$SG_ROOT/icon.png" icon.png 2>/dev/null || true

echo "Build terminé."

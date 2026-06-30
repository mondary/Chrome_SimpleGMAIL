import json
import os
import time
import asyncio
import threading
from contextlib import contextmanager, asynccontextmanager
from email.message import EmailMessage
from email.utils import parseaddr, formatdate, make_msgid
from pathlib import Path
from typing import Optional

import smtplib
import imaplib
imaplib.Debug = 0

import base64
import re

from imap_tools import MailBox, MailBoxStartTls, MailBoxUnencrypted, AND, MailMessageFlags
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response, StreamingResponse
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent
CONFIG_PATH = BASE_DIR / "config.json"
SECRETS_PATH = BASE_DIR / "secrets" / "mail.env"


def _reload_env(env_path: Path):
    """Charge les secrets locaux sans écraser les variables déjà exportées."""
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


# Le backend reste fonctionnel même s'il est lancé directement avec `python3 main.py`.
_reload_env(SECRETS_PATH)

# ---------- Message cache (in-memory, TTL) ----------
_MSG_CACHE = {}
_CACHE_TTL = 600  # 10 min
_CACHE_MAX = 500


def _cache_key(account, folder, uid):
    return f"{account}:{folder}:{uid}"


def cache_get(key):
    item = _MSG_CACHE.get(key)
    if item and time.time() - item[1] < _CACHE_TTL:
        return item[0]
    _MSG_CACHE.pop(key, None)
    return None


def cache_set(key, data):
    _MSG_CACHE[key] = (data, time.time())
    if len(_MSG_CACHE) > _CACHE_MAX:
        for k, _ in sorted(_MSG_CACHE.items(), key=lambda kv: kv[1][1])[:_CACHE_MAX // 4]:
            _MSG_CACHE.pop(k, None)


def cache_invalidate(account, folder=None, uid=None):
    if uid is not None:
        _MSG_CACHE.pop(_cache_key(account, folder or "", uid), None)
        return
    for k in list(_MSG_CACHE.keys()):
        if k.startswith(f"{account}:{folder}:" if folder else f"{account}:"):
            _MSG_CACHE.pop(k, None)


# ---------- Realtime (IMAP IDLE -> SSE) ----------
SUBSCRIBERS = []
MAIN_LOOP = None
_IDLE_LAST = {}


def broadcast(event: dict):
    loop = MAIN_LOOP
    if not loop:
        return

    def _push():
        for q in list(SUBSCRIBERS):
            try:
                q.put_nowait(event)
            except Exception:
                pass

    loop.call_soon_threadsafe(_push)


def _safe_load_config():
    try:
        return load_config(configured_only=True)
    except Exception:
        return {"accounts": []}


def _status_or_none(mailbox, name):
    try:
        return mailbox.folder.status(name)
    except Exception:
        return None


def idle_worker(account: dict):
    """Maintient une connexion IDLE sur INBOX et notifie les abonnés."""
    aid = account["id"]
    backoff = 8
    while True:
        try:
            with open_mailbox(account) as mb:
                mb.folder.set("INBOX")
                while True:
                    st = _status_or_none(mb, "INBOX")
                    if st is not None:
                        unseen = int(st.get("UNSEEN", 0) or 0)
                        total = int(st.get("MESSAGES", 0) or 0)
                        key = (unseen, total)
                        if _IDLE_LAST.get(aid) != key:
                            _IDLE_LAST[aid] = key
                            broadcast({
                                "type": "refresh",
                                "account": aid,
                                "folder": "INBOX",
                                "unseen": unseen,
                                "total": total,
                            })
                    started = False
                    try:
                        mb.idle.start()
                        started = True
                        mb.idle.wait(timeout_seconds=1740)  # ~29 min (re-IDLE avant timeout serveur)
                    except Exception:
                        pass
                    finally:
                        if started:
                            try:
                                mb.idle.done()
                            except Exception:
                                pass
            backoff = 8
        except Exception:
            time.sleep(backoff)
            backoff = min(backoff * 2, 120)


@asynccontextmanager
async def lifespan(app):
    global MAIN_LOOP
    MAIN_LOOP = asyncio.get_running_loop()
    if _is_demo():
        print("[DEMO] Mode démo actif — identifiants non configurés. Données fictives.")
    else:
        accounts = _safe_load_config().get("accounts", [])
        if not accounts:
            print("[CONFIG] Aucun compte mail actif. Configurez secrets/mail.env.")
        for acc in accounts:
            threading.Thread(
                target=idle_worker, args=(acc,), daemon=True, name=f"idle-{acc['id']}"
            ).start()
    yield


app = FastAPI(title="SimpleMail", lifespan=lifespan)


@app.get("/api/events")
async def events():
    q: asyncio.Queue = asyncio.Queue()
    SUBSCRIBERS.append(q)

    async def gen():
        try:
            while True:
                try:
                    ev = await asyncio.wait_for(q.get(), timeout=25)
                    yield f"data: {json.dumps(ev, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    yield ": ping\n\n"
        finally:
            try:
                SUBSCRIBERS.remove(q)
            except ValueError:
                pass

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


def load_config(configured_only: bool = False):
    if not CONFIG_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="config.json introuvable. Copiez config.example.json -> config.json et renseignez vos comptes.",
        )
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    data = _expand_env_values(data)
    if configured_only:
        data["accounts"] = [a for a in data.get("accounts", []) if _account_is_configured(a)]
    return data


def _expand_env_values(value):
    if isinstance(value, dict):
        return {k: _expand_env_values(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_expand_env_values(v) for v in value]
    if isinstance(value, str):
        return re.sub(r"\$\{([^}]+)\}", lambda m: os.environ.get(m.group(1), ""), value)
    return value


def get_account(account_id: str):
    cfg = load_config(configured_only=True)
    for a in cfg.get("accounts", []):
        if a["id"] == account_id:
            return a
    raise HTTPException(status_code=404, detail=f"Compte '{account_id}' inconnu")


@contextmanager
def open_mailbox(account):
    imap = account["imap"]
    host, port = imap["host"], imap.get("port", 993)
    ssl = imap.get("ssl", True)
    starttls = imap.get("starttls", False)
    if not imap.get("password"):
        raise HTTPException(status_code=500, detail=f"Mot de passe IMAP manquant pour {imap['user']}")
    if starttls:
        box = MailBoxStartTls(host, port)
    elif ssl:
        box = MailBox(host, port)
    else:
        box = MailBoxUnencrypted(host, port)
    try:
        conn = box.login(imap["user"], imap["password"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Connexion IMAP impossible pour {imap['user']} sur {host}:{port} ({e})")
    try:
        yield conn
    finally:
        try:
            conn.logout()
        except Exception:
            pass


def send_via_smtp(account, msg: EmailMessage):
    smtp = account["smtp"]
    host, port = smtp["host"], smtp.get("port", 465)
    ssl = smtp.get("ssl", True)
    starttls = smtp.get("starttls", False)
    if ssl:
        s = smtplib.SMTP_SSL(host, port, timeout=30)
    else:
        s = smtplib.SMTP(host, port, timeout=30)
        if starttls:
            s.starttls()
    try:
        s.login(smtp["user"], smtp["password"])
        return s.send_message(msg)
    finally:
        s.quit()


def header_value(headers, name: str, default: str = "") -> str:
    value = headers.get(name, default)
    if value is None:
        return default
    if isinstance(value, (list, tuple)):
        return ", ".join(str(v) for v in value if v is not None)
    return str(value)


# ---------- Models ----------

class SendRequest(BaseModel):
    account: str
    to: str
    subject: str = ""
    text: str = ""
    html: str = ""
    in_reply_to: Optional[str] = None
    references: Optional[str] = None
    cc: str = ""
    bcc: str = ""
    attachments: Optional[list[dict]] = None  # [{filename, content_type, data_b64}]


class FlagUpdate(BaseModel):
    seen: Optional[bool] = None
    flagged: Optional[bool] = None


class MoveMessageRequest(BaseModel):
    folder: str
    create_if_missing: bool = True


class FolderCreateRequest(BaseModel):
    name: str


# ---------- Demo mode ----------
def _demo_enabled():
    import os
    return os.environ.get("DEMO", "0") == "1"


def _is_demo():
    return _demo_enabled()


DEMO_ACCOUNT_IDS = {"demo"}

def _is_demo_account(account_id):
    return account_id in DEMO_ACCOUNT_IDS


def active_config():
    cfg = load_config(configured_only=True)
    if not cfg.get("accounts"):
        raise HTTPException(
            status_code=500,
            detail="Aucun compte mail réel connecté. Configurez secrets/mail.env.",
        )
    return cfg


def _account_is_configured(account: dict):
    imap_pw = account.get("imap", {}).get("password", "")
    smtp_pw = account.get("smtp", {}).get("password", "")
    return bool(imap_pw and smtp_pw and "MOT_DE_PASSE" not in imap_pw and "MOT_DE_PASSE" not in smtp_pw)


DEMO_ACCOUNTS = [
    {"id": "demo", "name": "Demo", "email": "demo@test.fr", "connected": True, "test": True},
]

DEMO_FOLDERS = {
    "perso": [
        {"name": "INBOX", "unseen": 9, "total": 49},
        {"name": "Sent", "unseen": 0, "total": 12},
        {"name": "Drafts", "unseen": 0, "total": 3},
        {"name": "Trash", "unseen": 0, "total": 5},
        {"name": "Junk", "unseen": 0, "total": 4},
    ],
    "pro": [
        {"name": "INBOX", "unseen": 5, "total": 20},
        {"name": "Sent", "unseen": 0, "total": 18},
        {"name": "Drafts", "unseen": 0, "total": 2},
        {"name": "Archive", "unseen": 0, "total": 35},
    ],
    "demo": [
        {"name": "INBOX", "unseen": 14, "total": 69},
        {"name": "Sent", "unseen": 0, "total": 30},
        {"name": "Drafts", "unseen": 0, "total": 5},
        {"name": "Trash", "unseen": 0, "total": 5},
        {"name": "Junk", "unseen": 0, "total": 4},
        {"name": "Archive", "unseen": 0, "total": 35},
    ],
}

import random as _rng
from datetime import datetime, timedelta, timezone

def _demo_msg(uid, account, folder, seen, flagged, has_att, subject, frm, snippet, html=None, days_ago=0):
    dt = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=_rng.randint(0, 8))
    return {
        "account": account,
        "uid": str(uid),
        "subject": subject,
        "from_name": frm.split("<")[0].strip() or frm,
        "from_addr": frm,
        "date": dt.isoformat(),
        "seen": seen,
        "flagged": flagged,
        "has_attachments": has_att,
        "attachment_count": (4 if "photos" in snippet.lower() else (2 if "devis" in snippet.lower() or "maquettes" in snippet.lower() else 1)) if has_att else 0,
        "snippet": snippet,
        "message_id": f"<demo-{uid}@sombre.mail>",
        "to": "moi@moi.fr",
        "cc": "",
        "text": snippet + "\n\nCordialement,\n" + frm,
        "html": html or f"<p>{snippet}</p><p>Cordialement,<br><b>{frm}</b></p>",
        "attachments": [],
    }

def _demo_messages(account, folder):
    import random as _rng
    from datetime import datetime, timedelta, timezone

    if folder != "INBOX":
        base = [
            ("Alice Martin <alice.martin@gmail.com>", "Réunion projet Sombre Mail", "Bonjour, est-ce que la réunion de demain est confirmée ? Merci !", False, True, False),
            ("GitHub <noreply@github.com>", "[FB/mail-client] PR #42 merged", "Your pull request has been merged into main.", False, False, False),
            ("Le Monde <newsletter@lemonde.fr>", "Votre briefing du jour", "Les principaux titres de l'actualité", False, False, False),
        ]
        msgs = []
        for i, (frm, subj, snippet, seen, flagged, has_att) in enumerate(base):
            full = _demo_msg(i + 1, account, folder, seen, flagged, has_att, subj, frm, snippet, days_ago=i)
            full["category"] = _categorize(full["from_addr"], full["from_name"], full["subject"])
            full["thread_id"] = str(full["uid"])
            msgs.append(full)
        return msgs

    now = datetime.now(timezone.utc)
    _uid = [0]
    def nxt():
        _uid[0] += 1
        return _uid[0]

    def m(frm, subj, snippet, seen, flagged, has_att, att_count, days_ago, thread_id, text=None, html=None):
        i = nxt()
        name = frm.split("<")[0].strip() or frm
        addr = frm if "<" not in frm else frm[frm.index("<")+1:frm.rindex(">")]
        dt = (now - timedelta(days=days_ago, hours=_rng.randint(0, 8))).replace(microsecond=0)
        return {
            "account": account,
            "uid": str(i),
            "subject": subj,
            "from_name": name,
            "from_addr": frm,
            "date": dt.isoformat(),
            "seen": seen,
            "flagged": flagged,
            "has_attachments": has_att,
            "attachment_count": att_count,
            "snippet": snippet[:200],
            "message_id": f"<demo-{i}@sombre.mail>",
            "to": "clement@mondary.design",
            "cc": "",
            "text": text or snippet,
            "html": html or f"<p>{snippet}</p>",
            "attachments": [],
            "category": _categorize(addr, name, subj),
            "thread_id": thread_id,
        }

    if account in ("perso", "demo"):
        entries = [
            # ─── CONV 1 : Projet Sombre Mail (4 msgs, PRIMARY) ───
            m("Alice Martin <alice.martin@gmail.com>",
              "Réunion projet Sombre Mail",
              "Bonjour Clément, est-ce que la réunion de demain est bien confirmée ? On doit valider le design final avant la fin de semaine. J'invite Bob.",
              False, True, False, 0, 8, "conv-sombre",
              text="Bonjour Clément,\n\nEst-ce que la réunion de demain est bien confirmée ? On doit valider le design final du client avant la fin de la semaine.\n\nJ'ai invité Bob à se joindre à nous pour la partie technique. On pourra aussi discuter du planning des prochains sprints.\n\nMerci,\nAlice"),
            m("Bob Leroy <bob.leroy@entreprise.com>",
              "Re: Réunion projet Sombre Mail",
              "Je serai présent demain 14h. J'ai préparé un slide deck avec les métriques de performance et l'état d'avancement de l'API. @Alice, tu partages le Figma ?",
              True, False, True, 3, 7, "conv-sombre",
              text="Salut,\n\nJe serai présent demain à 14h. J'ai préparé un slide deck avec :\n- Métriques de performance des 2 dernières semaines\n- État d'avancement de l'API backend (80% terminé)\n- Points bloquants sur l'intégration Stripe\n\n@Alice, tu peux partager le lien Figma pour que je montre l'intégration frontend ?\n\nJ'ai mis 3 slides en pièces jointes.\n\nBob"),
            m("Alice Martin <alice.martin@gmail.com>",
              "Re: Réunion projet Sombre Mail",
              "Super ! Voici l'ODJ : 1) Bilan design 2) Métriques 3) UX mobile 4) Sprint. Figma: https://figma.com/file/sombre-mail. À demain !",
              True, False, False, 0, 6, "conv-sombre",
              text="Génial !\n\nVoici l'ordre du jour final :\n1. Bilan design — validation des maquettes finales\n2. Métriques backend et performance\n3. UX mobile — adaptation responsive\n4. Prochain sprint — priorisation des tickets\n\nLe Figma est ici : https://figma.com/file/sombre-mail-v3\n\nÀ demain 14h !\nAlice"),
            m("Claire Dubois <claire@design.fr>",
              "Re: Réunion projet Sombre Mail",
              "J'ai finalisé les maquettes mobile cette nuit. 4 écrans prêts dans le Figma (onglet Mobile v3). Il reste quelques micro-ajustements sur la page profil.",
              True, False, True, 4, 4, "conv-sombre",
              text="Salut à tous,\n\nJ'ai finalisé les maquettes mobile cette nuit. Je les ai ajoutées au Figma dans la section \"Mobile v3\".\n\nÉcrans livrés :\n- Dashboard mobile\n- Détail d'un email\n- Composition de message\n- Page profil (avec menu latéral pliable)\n\nIl reste quelques ajustements sur la page profil mais c'est prêt pour la revue de demain.\n\nJ'ai joint les exports PNG des 4 écrans.\n\nClaire"),

            # ─── CONV 2 : Photos vacances Grèce (3 msgs, PRIMARY) ───
            m("Émilie Roux <emilie.roux@protonmail.com>",
              "Photos vacances Grèce",
              "Coucou ! Les photos du voyage sont enfin triées. 8 clichés magnifiques : coucher de soleil à Santorin, plages de Crète et ruines d'Athènes. Dis-moi ce que tu en penses !",
              False, True, True, 8, 15, "conv-photos",
              text="Coucou !\n\nLes photos du voyage en Grèce sont enfin triées et retouchées. Je t'ai mis les 8 meilleures clichés en pièce jointe :\n\n- Coucher de soleil à Santorin (x3)\n- Plages de Crète (x2)\n- Ruines d'Athènes (x2)\n- Portrait sympa (x1)\n\nDis-moi ce que tu en penses ! La prochaine fois on y va ensemble ?\n\nBisous,\nÉmilie"),
            m("Émilie Roux <emilie.roux@protonmail.com>",
              "Re: Photos vacances Grèce",
              "Trop contente que tu aimes ! J'ai retrouvé 5 autres photos qu'on avait prises à Mykonos, je te les joins aussi. Le coucher de soleil reste mon préféré !",
              True, False, True, 5, 12, "conv-photos",
              text="Coucou,\n\nTrop contente que tu aimes les photos ! J'ai retrouvé 5 autres clichés qu'on avait pris à Mykonos, je te les joins aussi.\n\nMon préféré reste le coucher de soleil avec les mouettes — la lumière était incroyable ce jour-là.\n\nTu veux que je t'envoie les versions RAW pour que tu puisses les retoucher ?\n\nBisous,\nÉmilie"),

            # ─── CONV 3 : Devis e-commerce (3 msgs, PRIMARY) ───
            m("Bob Leroy <bob.leroy@entreprise.com>",
              "Devis site e-commerce",
              "Salut Clément, comme convenu voici le devis pour le site e-commerce. J'ai détaillé chaque poste : design (8j), intégration (5j), développement backend (10j), tests (3j). Total : 12 500€ HT.",
              False, False, True, 1, 20, "conv-devis",
              text="Salut Clément,\n\nComme convenu, voici le devis pour le projet de site e-commerce.\n\nDétail des prestations :\n- Design UX/UI : 8 jours ouvrés\n- Intégration frontend responsive : 5 jours\n- Développement backend (API, panier, paiement Stripe) : 10 jours\n- Tests et recette : 3 jours\n\nTotal : 12 500€ HT (soit 15 000€ TTC)\n\nDélai estimé : 6 à 8 semaines selon vos disponibilités pour les validations.\n\nLe devis détaillé est en pièce jointe. N'hésite pas si tu as des questions !\n\nBob"),
            m("Bob Leroy <bob.leroy@entreprise.com>",
              "Re: Devis site e-commerce",
              "J'ai modifié le devis comme demandé : j'ai ajouté le module de newsletter (2j supplémentaires) et la gestion des avis clients (1j). Nouveau total : 14 000€ HT.",
              True, False, True, 1, 17, "conv-devis",
              text="Salut,\n\nJ'ai modifié le devis comme demandé lors de notre appel :\n\n- Ajout du module newsletter avec Mailchimp : +2 jours (1 500€)\n- Ajout de la gestion des avis clients : +1 jour (750€)\n\nNouveau total : 14 000€ HT (soit 16 800€ TTC)\n\nDevis modifié en pièce jointe.\n\nDis-moi si tout te convient,\nBob"),

            # ─── CONV 4 : Incident serveur o2switch (3 msgs, UPDATES) ───
            m("Support <support@o2switch.net>",
              "Ticket #48291 - Incident serveur hébergement",
              "Nous avons détecté un incident sur le serveur mutualisé hébergeant votre site. Nos équipes travaillent à la résolution. Temps estimé : 2-3 heures. Désolé pour la gêne.",
              True, False, False, 0, 5, "conv-support",
              text="Bonjour,\n\nNous avons détecté un incident technique sur le serveur mutualisé hébergeant votre site (serveur srv23.o2switch.net).\n\nImpact : votre site est actuellement inaccessible.\n\nCause identifiée : pic de charge anormal lié à une attaque DDoS sur un autre compte du même serveur.\n\nNos équipes travaillent à la résolution. Temps estimé : 2 à 3 heures.\n\nNous vous tiendrons informés de l'évolution de la situation.\n\nCordialement,\nSupport technique o2switch"),
            m("Support <support@o2switch.net>",
              "Re: Ticket #48291 - Incident serveur résolu",
              "L'incident est résolu. Votre site est de nouveau accessible. Le trafic a été isolé et le serveur stabilisé. Nous renforçons la surveillance pour les prochaines 24h. Bonne journée.",
              True, False, False, 0, 2, "conv-support",
              text="Bonjour,\n\nL'incident est désormais résolu.\n\nActions réalisées :\n- Isolation du trafic malveillant\n- Redémarrage du service Apache\n- Réactivation de votre site\n- Mise en place de règles de filtrage additionnelles\n\nVotre site est de nouveau accessible. Nous renforçons la surveillance pour les prochaines 24h.\n\nNous vous présentons nos excuses pour la gêne occasionnée.\n\nBonne journée,\nSupport technique o2switch"),

            # ─── CONV 5 : Proposition freelance (5 msgs, PRIMARY) ───
            m("Sophie Lambert <sophie.lambert@gmail.com>",
              "Proposition freelance - Refonte site vitrine",
              "Bonjour Clément, je suis passée par le portfolio de votre site et j'aimerais vous confier la refonte du site vitrine de mon cabinet d'architectes. Stack : Next.js + Tailwind. Budget : 8-12k€. Disponible pour un call ?",
              False, True, False, 0, 14, "conv-freelance",
              text="Bonjour Clément,\n\nJe suis Sophie Lambert, architecte DPLG. Je suis passée par votre portfolio et j'ai été impressionnée par la qualité de vos réalisations.\n\nJ'aimerais vous confier la refonte complète du site vitrine de mon cabinet d'architecture.\n\nLe projet inclut :\n- Un site portfolio avec galerie d'images plein écran\n- Une page projet avec plans et coupes téléchargeables\n- Un blog / actualités\n- Un formulaire de contact\n- Stack souhaité : Next.js + Tailwind CSS\n\nBudget estimé : 8 000€ à 12 000€ HT.\n\nSeriez-vous disponible pour un call cette semaine ou la prochaine pour qu'on en discute ?\n\nCordialement,\nSophie Lambert"),
            m("Sophie Lambert <sophie.lambert@gmail.com>",
              "Re: Proposition freelance - Refonte site vitrine",
              "Excellent ! Quel plaisir de vous entendre motivé. Je vous joins les maquettes papier scannées ainsi que le cahier des charges détaillé. Le projet est assez urgent (idéalement en ligne pour novembre).",
              True, False, True, 2, 11, "conv-freelance",
              text="Bonjour Clément,\n\nExcellent, je suis ravie que le projet vous intéresse !\n\nJe vous joins en pièces jointes :\n1. Le cahier des charges détaillé (PDF, 12 pages)\n2. Les maquettes papier scannées avec mes annotations\n\nLe projet est assez urgent : j'aimerais idéalement être en ligne pour novembre (c'est le début de la saison des appels d'offres).\n\nQuand seriez-vous disponible pour un premier call de cadrage ?\n\nBien cordialement,\nSophie Lambert"),
            m("Sophie Lambert <sophie.lambert@gmail.com>",
              "Re: Proposition freelance - Refonte site vitrine",
              "J'ai bien reçu votre devis, merci ! Je valide le budget de 9 500€. Quelques retours sur les maquettes : j'aimerais un espace plus grand pour les photos des réalisations. Je joins un exemple de site que j'aime.",
              True, False, True, 1, 7, "conv-freelance",
              text="Bonjour Clément,\n\nJ'ai bien reçu votre devis et je le valide au budget de 9 500€ HT. Super !\n\nJ'ai quelques retours sur les premières maquettes :\n- L'espace dédié aux photos des réalisations est trop petit — j'aimerais passer en mode gallery plein écran\n- La page contact pourrait inclure un plan interactif\n- Ajouter un espace presse / mentions\n\nJe joins un exemple de site dont j'aime la direction artistique, pour vous donner une idée de ce que j'imagine.\n\nHâte de voir la V2 !\n\nSophie"),

            # ─── CONV 6 : Le Monde newsletter (7 msgs, PROMOTIONS) ───
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 24 juin",
              "🇫🇷 Politique : le nouveau gouvernement dévoile son programme. Économie : la Bourse de Paris en hausse. Culture : le Festival d'Avignon dévoile sa programmation.",
              True, False, False, 0, 8, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 24 juin :\n\n🇫🇷 POLITIQUE\nLe nouveau gouvernement a dévoilé son programme économique aujourd'hui. Parmi les mesures phares : baisse des impôts pour les classes moyennes et investissements dans la transition écologique.\n\n📈 ÉCONOMIE\nLa Bourse de Paris a clôturé en hausse de 1,2% portée par le secteur du luxe.\n\n🎭 CULTURE\nLe Festival d'Avignon a dévoilé sa programmation 2026 avec 40 spectacles au programme.\n\n⚽ SPORT\nL'équipe de France se prépare pour son match amical de samedi.\n\nBonne journée,\nLa rédaction du Monde"),
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 25 juin",
              "International : sommet européen à Bruxelles. Tech : la France accueille le plus grand data center d'Europe. Météo : canicule sur tout le sud-est.",
              True, False, False, 0, 7, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 25 juin :\n\n🇪🇺 INTERNATIONAL\nSommet européen à Bruxelles : les 27 se sont mis d'accord sur le nouveau pacte migratoire. L'Italie a obtenu des concessions.\n\n💻 TECH\nLa France accueillera le plus grand data center d'Europe, construit par Google dans l'Aisne. 300 emplois à la clé.\n\n🌡️ MÉTÉO\nMétéo France place 12 départements en vigilance orange canicule. Jusqu'à 38°C attendus dans le sud-est.\n\nBonne journée,\nLa rédaction du Monde"),
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 26 juin",
              "Enquête : les coulisses de la French Tech. Santé : un nouveau vaccin contre la grippe approuvé. Cinéma : les sorties de la semaine.",
              True, False, False, 0, 6, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 26 juin :\n\n🔍 ENQUÊTE\n\"French Tech : les coulisses du miracle français\" — notre enquête révèle les dessous du succès des startups tricolores.\n\n💉 SANTÉ\nL'ANSM a approuvé un nouveau vaccin contre la grippe saisonnière, plus efficace sur les personnes âgées.\n\n🎬 CINÉMA\nLes sorties de la semaine : le nouveau film de François Ozon et la surprise du mois, un documentaire sur le street art.\n\nBonne journée,\nLa rédaction du Monde"),
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 27 juin",
              "Ça chauffe à l'Assemblée : débat houleux sur la réforme des retraites. Les syndicats appellent à une journée de grève. Foot : le PSG officialise son nouveau coach.",
              True, False, False, 0, 5, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 27 juin :\n\n🏛️ POLITIQUE\nÇa chauffe à l'Assemblée nationale : le débat sur la réforme des retraites a dégénéré cette nuit. Les syndicats appellent à une journée de grève nationale le 15 juillet.\n\n📊 ÉCONOMIE\nLe chômage a baissé de 0,3% au deuxième trimestre. Du jamais-vu depuis 2008.\n\n⚽ SPORT\nLe PSG officialise l'arrivée de son nouveau coach : l'Italien Antonio Conte signe pour 3 saisons.\n\nBonne journée,\nLa rédaction du Monde"),
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 28 juin",
              "Exclusif : les archives secrètes du Vatican. Paralympiques : la France en tête des médailles. Le guide des festivals de l'été.",
              False, False, False, 0, 4, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 28 juin :\n\n📜 EXCLUSIF\nNotre journaliste a eu accès aux archives secrètes du Vatican. Révélations sur les coulisses du conclave de 2013.\n\n🏅 PARALYMPIQUES\nLa France est en tête du classement des médailles aux Paralympiques de Los Angeles avec déjà 23 médailles.\n\n🎶 FESTIVALS\nNotre guide des festivals de l'été 2026 : de jazz à Rock en Seine, tous les bons plans.\n\nBonne journée,\nLa rédaction du Monde"),
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 29 juin",
              "Découvrez notre grand format : la Seine-et-Marne vue du ciel. Également : le retour du vinyle, enquête sur un business en pleine croissance.",
              True, False, False, 0, 3, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 29 juin :\n\n📸 GRAND FORMAT\n\"La Seine-et-Marne vue du ciel\" — notre photographe a survolé le département pour un reportage exceptionnel sur les trésors cachés de la région.\n\n💿 CULTURE\nLe retour du vinyle : enquête sur un business qui explose. +32% de ventes en un an. Les jeunes sont les premiers acheteurs.\n\n🍽️ GASTRONOMIE\nLes nouvelles adresses parisiennes à ne pas manquer cet été.\n\nBonne journée,\nLa rédaction du Monde"),
            m("Le Monde <newsletter@lemonde.fr>",
              "Votre briefing du 30 juin",
              "Aujourd'hui dans Le Monde : la révolution de l'IA en France, le guide des marchés de Provence, et notre enquête sur le nouveau visage du RN.",
              False, False, False, 0, 1, "conv-lemonde",
              text="Bonjour,\n\nVoici votre briefing du 30 juin :\n\n🤖 TECHNOLOGIE\n\"La révolution de l'IA en France\" — notre dossier spécial sur comment l'intelligence artificielle transforme nos entreprises. Témoignages, analyse et perspectives.\n\n🗳️ POLITIQUE\nNotre enquête sur le nouveau visage du Rassemblement National : stratégie de dédiabolisation, nouveaux cadres et ambitions pour 2027.\n\n🥖 GUIDE\nLes plus beaux marchés de Provence : notre sélection pour vos vacances.\n\nBonne journée,\nLa rédaction du Monde"),

            # ─── CONV 7 : Substack newsletter (3 msgs, PROMOTIONS) ───
            m("Art Letters <newsletter@substack.com>",
              "The Hidden Symbolism of the Mona Lisa",
              "Did you know the Mona Lisa contains hidden geometric patterns? In this issue, we decode Da Vinci's secret symbols and explore how Renaissance artists embedded meaning in every brushstroke.",
              True, False, False, 0, 18, "conv-substack",
              text="Dear reader,\n\nDid you know the Mona Lisa contains hidden geometric patterns?\n\nIn this week's issue:\n🔍 The secret symbols hidden in Da Vinci's masterpieces\n🎨 How Renaissance artists used color to convey power\n🏛️ The forgotten meaning behind classical architecture\n\nPlus our weekly art market report and upcoming exhibition calendar.\n\nRead the full article on Substack.\n\nBest,\nArt Letters"),
            m("Art Letters <newsletter@substack.com>",
              "Van Gogh's Lost Sketch Discovered in Amsterdam",
              "A previously unknown Van Gogh sketch has been found in an Amsterdam archive. Our exclusive analysis of what this means for art history and the sketch's estimated value at auction.",
              True, False, False, 0, 11, "conv-substack",
              text="Dear reader,\n\nBreaking news in the art world:\n\nA previously unknown Van Gogh sketch has been discovered in the archives of the Rijksmuseum in Amsterdam. The sketch, dated 1888, shows a preliminary study for what would later become \"The Bedroom\".\n\nIn this issue:\n🔍 Exclusive analysis by our curatorial team\n💰 Estimated auction value: €2-3 million\n📜 The sketch's provenance trail from 1888 to today\n\nRead the full story on Substack.\n\nBest,\nArt Letters"),
            m("Art Letters <newsletter@substack.com>",
              "The Bauhaus Effect: 100 Years of Design Revolution",
              "How a German art school from 1919 changed everything — from your iPhone to the chair you're sitting on. A deep dive into Bauhaus principles and their modern legacy.",
              True, False, False, 0, 4, "conv-substack",
              text="Dear reader,\n\nThis year marks 105 years since the founding of the Bauhaus school. Its influence is everywhere — from your iPhone's minimalist interface to the chair you're sitting on.\n\nIn this issue:\n🏗️ The 7 essential Bauhaus principles\n📱 How Bauhaus shaped modern UI/UX design\n🏠 Bauhaus architecture around the world: 12 must-see buildings\n\nRead the full deep dive on Substack.\n\nBest,\nArt Letters"),

            # ─── CONV 8 : Medium digest (3 msgs, PROMOTIONS) ───
            m("Medium Daily <digest@medium.com>",
              "Your weekly reads: AI, design, and the future of work",
              "This week's top stories: 'Why I left FAANG for a startup', 'The hidden cost of agile', and 'Design systems are killing creativity'. Start reading →",
              True, False, False, 0, 12, "conv-medium",
              text="Hi there,\n\nHere are this week's top stories picked for you:\n\n📝 'Why I Left FAANG for a Startup' by Sarah Chen — 12K reads\n📝 'The Hidden Cost of Agile' by Mark Johnson — 8.5K reads\n📝 'Design Systems Are Killing Creativity' by Elena Vogt — 6.2K reads\n📝 'How to Write Clean Code' by Robert Martins — 5.1K reads\n\nContinue reading on Medium →\n\nHappy reading,\nThe Medium Team"),
            m("Medium Daily <digest@medium.com>",
              "Stories you missed: productivity, psychology, tech",
              "Catch up on 'The 5 AM Club is a lie', 'Why your brain loves Notion', and 'A beginner's guide to Rust in 2026'. Your weekend reading sorted.",
              True, False, False, 0, 7, "conv-medium",
              text="Hi there,\n\nStories you might have missed this week:\n\n⏰ 'The 5 AM Club Is a Lie: What Actually Works' — 22K reads\n🧠 'Why Your Brain Loves Notion' — 15K reads\n🦀 'A Beginner's Guide to Rust in 2026' — 11K reads\n🎨 'The Psychology of Color in UI Design' — 9K reads\n\nYour weekend reading is sorted!\n\nThe Medium Team"),
            m("Medium Daily <digest@medium.com>",
              "Editor's picks: the best of Medium this month",
              "Our editors selected the 10 best articles of June. Featuring investigative journalism, personal essays, and breakthrough scientific discoveries. Don't miss this curated collection.",
              True, False, False, 0, 2, "conv-medium",
              text="Hi there,\n\nOur editors have curated the 10 best articles of June 2026:\n\n🏆 'Inside the Theranos of AI' — investigative journalism\n🏆 'My Year of Living Without Algorithms' — personal essay\n🏆 'Breakthrough: Alzheimer's Blood Test Now 95% Accurate' — science\n🏆 'The Last Days of the Berlin Club Scene' — culture\n🏆 'How Notion Replaced My Entire Life' — productivity\n\nRead the full collection on Medium →\n\nThe Medium Team"),

            # ─── CONV 9 : Discord conversation (2 msgs, SOCIAL) ───
            m("Discord <no-reply@discord.com>",
              "💬 @thomas#2847 vous a mentionné dans #design-review",
              "Thomas a écrit : '@Clément tu peux jeter un oeil à ma PR sur le composant Button ? J'ai un souci avec le focus ring sous Safari.'",
              True, False, False, 0, 3, "conv-discord",
              text="Nouvelle mention sur Discord\n\nSalon : #design-review\n\nThomas (thomas#2847) a écrit :\n\"@Clément tu peux jeter un oeil à ma PR sur le composant Button ? J'ai un souci avec le focus ring sous Safari, le outline ne s'affiche pas correctement quand on navigue au clavier.\"\n\nRépondre sur Discord →"),
            m("Discord <no-reply@discord.com>",
              "💬 @thomas#2847 a répondu dans #design-review",
              "Thomas a écrit : 'Merci pour la review ! J'ai pushé le fix avec le @apply focus-visible. Tu peux re-check quand t'as 5 min ?'",
              True, False, False, 0, 2, "conv-discord",
              text="Nouveau message sur Discord\n\nSalon : #design-review\n\nThomas (thomas#2847) a écrit :\n\"Merci pour la review ! J'ai pushé le fix avec le @apply focus-visible. Tu peux re-check quand t'as 5 min ?\"\n\nRépondre sur Discord →"),

            # ─── STANDALONE : Purchases ───
            m("Stripe <receipts@stripe.com>",
              "Paiement reçu de 89,00€ — Facture INV-2026-3847",
              "Vous avez reçu un paiement de 89,00€ de la part de Marie Lefèvre (marie.lefevre@gmail.com). Deux appels de design review facturés au tarif de 45€/heure.",
              True, False, False, 0, 10, "standalone",
              text="Paiement reçu avec Stripe\n\nMontant : 89,00€\nDe : Marie Lefèvre (marie.lefevre@gmail.com)\nFacture : INV-2026-3847\nDate : 20 juin 2026\n\nDétail :\n- Design review sprint #12 : 1h à 45€\n- Design review sprint #13 : 1h à 45€\n\nTotal : 89,00€ TTC (TVA non applicable, art. 293B du CGI)\n\nVoir la facture complète sur Stripe →"),
            m("Stripe <receipts@stripe.com>",
              "Paiement reçu de 249,00€ — Facture INV-2026-3912",
              "Paiement reçu de Sophie Lambert pour l'acompte sur la refonte du site vitrine (30% du devis validé). Merci d'avoir utilisé Stripe.",
              False, True, False, 0, 11, "standalone",
              text="Paiement reçu avec Stripe\n\nMontant : 249,00€\nDe : Sophie Lambert (sophie.lambert@gmail.com)\nFacture : INV-2026-3912\n\nDétail : Acompte 30% sur devis refonte site vitrine — 9 500€ HT\n\nProchaine échéance : à la livraison des maquettes finales\n\nVoir sur Stripe →"),
            m("Stripe <receipts@stripe.com>",
              "Paiement reçu de 1 200,00€ — Abonnement annuel",
              "Paiement reçu de votre client Entreprise SAS pour l'abonnement annuel au logiciel. Montant : 1 200,00€. Prochain renouvellement le 15/06/2027.",
              True, False, False, 0, 21, "standalone",
              text="Paiement récurrent reçu avec Stripe\n\nMontant : 1 200,00€\nDe : Entreprise SAS (compta@entreprise-sas.fr)\nMotif : Abonnement annuel Suite Pro — renouvellement 2026-2027\n\nProchain renouvellement : 15 juin 2027\n\nVoir la facture sur Stripe →"),

            # ─── STANDALONE : Updates ───
            m("Amazon <shipment@amazon.fr>",
              "Votre commande #302-8492011 a été expédiée",
              "Votre colis contenant 'Sony WH-1000XM6 (Casque audio sans fil)' est en cours de livraison. Livraison prévue demain entre 14h et 18h.",
              True, False, False, 0, 4, "standalone",
              text="Bonjour Clément,\n\nVotre commande #302-8492011 a été expédiée !\n\n📦 Contenu :\n- Sony WH-1000XM6 (Casque audio sans fil à réduction de bruit) × 1\n\n📍 Livraison prévue : demain entre 14h et 18h\n🚚 Transporteur : Colissimo\n\nSuivre mon colis →\n\nMerci d'avoir commandé sur Amazon.fr"),
            m("Apple <no_reply@apple.com>",
              "Votre facture Apple — iCloud+ 2TB",
              "Merci pour votre achat. Abonnement iCloud+ 2TB : 9,99€/mois. Facture disponible dans votre compte Apple. Paiement effectué le 15/06/2026.",
              True, False, False, 0, 16, "standalone",
              text="Bonjour,\n\nMerci pour votre achat sur l'Apple Store.\n\nRécapitulatif :\n- iCloud+ 2TB : abonnement mensuel\n- Montant : 9,99€ TTC\n- Date : 15 juin 2026\n- Mode de paiement : Visa se terminant par 4242\n\nCette facture est disponible dans votre compte Apple.\n\nL'équipe Apple"),
            m("Apple <no_reply@apple.com>",
              "Votre reçu Apple — App Store",
              "Vous avez effectué un achat de 5,99€ pour 'Bear - Notes App (Annuel)'. Merci d'utiliser l'App Store.",
              True, False, False, 0, 9, "standalone",
              text="Bonjour,\n\nReçu pour votre achat sur l'App Store.\n\nProduit : Bear - Notes App (Abonnement annuel)\nMontant : 5,99€ TTC\nDate : 21 juin 2026\n\nMerci d'utiliser l'App Store.\n\nL'équipe Apple"),
            m("OVH <support@ovh.com>",
              "Facture OVHcloud #OVH3847201 - Renouvellement hébergement",
              "Votre hébergement mutualisé Pro (srv.ovh.net) a été renouvelé pour 12 mois. Montant TTC : 71,88€. Paiement automatique effectué.",
              True, False, True, 1, 22, "standalone",
              text="Bonjour,\n\nVotre service OVHcloud a été renouvelé.\n\n🔧 Service : Hébergement mutualisé Pro\n🌐 Domaine : clément-mondary.fr\n📅 Période : 15 juin 2026 → 14 juin 2027\n💰 Montant : 71,88€ TTC\n💳 Paiement automatique : Visa ****4242\n\nFacture détaillée en pièce jointe.\n\nMerci de votre confiance,\nL'équipe OVHcloud"),

            # ─── STANDALONE : Social ───
            m("LinkedIn <invitations@linkedin.com>",
              "Vous avez 5 nouvelles invitations à rejoindre votre réseau",
              "Jean Petit (CTO @ TechCorp), Marie Lefevre (Designer @ Figma), Lucas Moreau (Dev @ Google), Sarah Benali (PM @ Stripe) et Thomas Martin (CEO @ Startup.io) souhaitent se connecter.",
              True, False, False, 0, 5, "standalone",
              text="Nouvelles invitations LinkedIn\n\nLes personnes suivantes souhaitent se connecter avec vous :\n\n👤 Jean Petit — CTO @ TechCorp\n👤 Marie Lefevre — Product Designer @ Figma\n👤 Lucas Moreau — Software Engineer @ Google\n👤 Sarah Benali — Product Manager @ Stripe\n👤 Thomas Martin — CEO @ Startup.io\n\nAccepter | Ignorer | Voir toutes les invitations"),
            m("LinkedIn <jobs-recommendations@linkedin.com>",
              "Offre d'emploi : Senior UI Designer chez Vercel (Paris)",
              "Ce poste correspond à votre profil. Vercel recherche un Senior UI Designer pour rejoindre leur équipe Design Systems. 5+ ans d'expérience, maîtrise de Figma et Tailwind. Postulez maintenant !",
              True, False, False, 0, 6, "standalone",
              text="Une offre d'emploi pour vous\n\n🏢 Vercel — Senior UI Designer\n📍 Paris (Hybride)\n💼 CDI — 65k-85k€\n\nMissions :\n- Designer et maintenir le design system de Vercel\n- Collaborer avec l'équipe engineering\n- Conduire des recherches utilisateurs\n\nProfil recherché :\n- 5+ ans d'expérience en UI/product design\n- Maîtrise de Figma, Tailwind CSS, design tokens\n- Expérience avec les systèmes de design à grande échelle\n\nPostuler maintenant sur LinkedIn"),
            m("Twitter <notifications@twitter.com>",
              "Thomas A. (@thomas_dev) a commencé à vous suivre",
              "Thomas A., Senior Engineer @ Google, vous suit désormais. Son profil : spécialiste React/TypeScript, 12K followers. Voir son profil →",
              True, False, False, 0, 1, "standalone",
              text="Nouvel abonné Twitter\n\n👤 Thomas A. (@thomas_dev)\n🧑‍💼 Senior Software Engineer @ Google\n📍 Zurich, Suisse\n👥 12K followers | 3 421 abonnements\n\nThomas a commencé à vous suivre. Lui rendre la pareille ?\n\nVoir le profil →"),
            m("Pinterest <noreply@pinterest.com>",
              "Épingles recommandées pour vous : Design et typographie",
              "Découvrez ces épingles inspirantes : '50 magnifiques palettes de couleurs', 'Les plus belles polices 2026' et 'Minimalist web design trends'. Sauvegardez-les dans vos tableaux !",
              True, False, False, 0, 9, "standalone",
              text="Nouvelles épingles recommandées\n\n📌 '50 magnifiques palettes de couleurs pour votre prochain projet'\n📌 'Les plus belles polices de 2026 — Sélection par des designers'\n📌 'Minimalist Web Design Trends : ce qui marche en 2026'\n📌 '15 landing pages inspirantes à étudier'\n\nSauvegarder dans mes tableaux →"),

            # ─── STANDALONE : Forums ───
            m("Reddit <noreply@reddit.com>",
              "Nouveau message sur r/france : 'Quel IDE utilisez-vous ?'",
              "La discussion 'Quel IDE utilisez-vous pour le développement web en 2026 ?' a 45 commentaires. Votre avis est sollicité dans le thread !",
              True, False, False, 0, 3, "standalone",
              text="Nouvelle activité sur Reddit\n\nSubreddit : r/france\n\nDiscussion : \"Quel IDE utilisez-vous pour le développement web en 2026 ?\"\n\n45 commentaires — votre avis est le bienvenu !\n\nLes réponses les plus populaires :\n- VS Code (82%)\n- WebStorm (10%)\n- Zed (5%)\n- Vim/Neovim (3%)\n\nVoir la discussion →"),
            m("Stack Overflow <noreply@stackoverflow.com>",
              "Your question has 15 upvotes and 3 answers",
              "Your question 'How to implement virtual scrolling with Tailwind CSS and React?' has reached 15 upvotes. The accepted answer by @dan_abramov has 42 upvotes.",
              True, False, False, 0, 13, "standalone",
              text="Stack Overflow — Question Activity\n\nQuestion: How to implement virtual scrolling with Tailwind CSS and React?\n\n📈 Score: +15\n💬 Answers: 3\n✅ Accepted answer by @dan_abramov (+42)\n\n\"You can use react-window with Tailwind. Here's a working example:\n...\nMake sure to wrap your row renderer with React.memo for performance.\"\n\nView your question →"),

            # ─── STANDALONE : Updates (tools) ───
            m("Figma <notifications@figma.com>",
              "Nouveau commentaire de Julie sur 'Maquette V3 - Dashboard'",
              "Julie a écrit : 'Le spacing entre les cards est trop large sur mobile. On pourrait passer de 24px à 16px ? Et ajouter un état de loading sur les graphiques.'",
              False, True, False, 0, 3, "standalone",
              text="Nouveau commentaire Figma\n\nFichier : Sombre Mail — App V3\nPage : Dashboard Mobile\n\nJulie (@julie.design) a commenté :\n\n\"Le spacing entre les cards est trop large sur mobile. On pourrait passer de 24px à 16px ? Et penser à ajouter un état de loading / skeleton sur les graphiques avant que les données arrivent.\"\n\nRépondre sur Figma →"),
            m("Figma <notifications@figma.com>",
              "@mention de Clément dans 'Design System - Components'",
              "Marc vous a mentionné : '@Clément est-ce que tu peux ajouter les états disabled du bouton primaire dans la lib ? On en a besoin pour le formulaire de connexion.'",
              True, False, False, 0, 1, "standalone",
              text="Mention sur Figma\n\nFichier : Design System — Components\nPage : Buttons\n\nMarc (@marc.lead) vous a mentionné :\n\n\"@Clément est-ce que tu peux ajouter les états disabled du bouton primaire dans la lib ? On en a besoin pour le formulaire de connexion (page 4 du prototype).\"\n\nVoir dans Figma →"),
            m("Linear <notifications@linear.app>",
              "Tâche SITE-42 assignée : 'Finaliser page contact responsive'",
              "Nouvelle tâche assignée par Marc. Priorité : High. Sprint courant. Deadline : vendredi. Voir dans Linear.",
              True, False, False, 0, 3, "standalone",
              text="Nouvelle tâche Linear assignée\n\n📋 SITE-42 — Finaliser page contact responsive\n\nAssignée par : Marc L.\nPriorité : ⚡ High\nSprint : Sprint 24 (en cours)\nDeadline : Vendredi\n\nDescription :\n- Adapter le formulaire de contact pour mobile\n- Ajouter la validation des champs côté client\n- Tester l'envoi avec le nouveau endpoint API\n\nVoir dans Linear →"),
            m("Notion <notifications@notion.so>",
              "@Clément mentionné dans 'Roadmap Produit Q3 2026'",
              "Sophie vous a mentionné dans la page Roadmap : '@Clément peux-tu estimer le temps pour la fonctionnalité de recherche avancée ? On doit caler le planning la semaine prochaine.'",
              True, False, False, 0, 5, "standalone",
              text="Mention sur Notion\n\n📄 Page : Roadmap Produit Q3 2026\n\nSophie (@sophie.pm) a écrit :\n\n\"@Clément peux-tu estimer le temps nécessaire pour la fonctionnalité de recherche avancée avec filtres ? On doit caler le planning de la semaine prochaine et j'ai besoin de ton input avant la réunion.\"\n\nVoir dans Notion →"),
            m("Vercel <no-reply@vercel.com>",
              "⚠️ Deployment Failed — Production (main@2a3f8b1)",
              "Le déploiement de votre site sur Vercel a échoué. Erreur : Build timeout after 45s. Consultez les logs de build pour plus de détails.",
              True, False, False, 0, 1, "standalone",
              text="Échec de déploiement Vercel\n\nProjet : client-sombre-mail\nBranche : main (commit 2a3f8b1)\nEnvironnement : Production\n\n❌ Build failed after 45s\n\nErreur : Build timeout exceedé. Vérifiez que votre build n'a pas de dépendances bloquantes ou de boucles infinies.\n\nLogs de build :\n[00:00:01] Cloning repository...\n[00:00:05] Installing dependencies...\n[00:00:30] Running build script...\n[00:00:45] ⚠️ TIMEOUT — Build cancelled\n\nRedeploy → | Voir les logs →"),

            # ─── STANDALONE : Other primary ───
            m("Lucie Mercier <lucie.mercier@gmail.com>",
              "Invitation anniversaire 🎂",
              "Salut ! Je fête mes 30 ans samedi prochain à la maison. Ambiance barbecue + pétanque, amène de quoi griller. Je t'envoie l'adresse par SMS. Fais tourner !",
              False, False, False, 0, 20, "standalone",
              text="Salut Clément !\n\nJe fête mes 30 ans samedi prochain à la maison ! 🎂\n\nAu programme :\n- Barbecue géant (je ramène la viande, amène ce que tu veux boire)\n- Tournoi de pétanque\n- Musique (amène ta playlist)\n- Feu d'artifice vers 23h\n\nÇa commence vers 15h, finit quand le voisin appelle les flics.\n\nFais tourner l'info aux autres !\n\nLucie"),
            m("David Chen <d.chen@startup.io>",
              "Partenariat StartUp.io × Clément",
              "Bonjour Clément, nous préparons une mise à jour majeure de notre plateforme et cherchons un designer UI/UX freelance pour un contrat de 3 mois renouvelable. Budget : 15-20k€/mois. Intéressé ?",
              True, False, False, 0, 13, "standalone",
              text="Bonjour Clément,\n\nJe suis David Chen de StartUp.io. Nous sommes une plateforme SaaS de mise en relation entre startups et investisseurs.\n\nNous préparons une refonte complète de notre interface et cherchons un designer UI/UX freelance expérimenté pour un contrat de 3 mois (renouvelable).\n\nStack : React + TypeScript + Tailwind\nBudget : 15 000€ à 20 000€ par mois\nDébut : dès que possible\n\nSeriez-vous intéressé par un call pour qu'on en discute ?\n\nBien cordialement,\nDavid Chen — Head of Product @ StartUp.io"),
            m("The Guardian <newsletter@theguardian.com>",
              "This Week in News: Global Edition",
              "From climate summit breakthroughs to AI regulation debates — here's your weekly roundup of the stories shaping our world. Plus: our critics' picks for what to watch and read this weekend.",
              True, False, False, 0, 6, "standalone",
              text="Good morning,\n\nThis week's top stories from The Guardian:\n\n🌍 GLOBAL\nClimate summit reaches historic agreement on carbon pricing. 195 nations sign the accord.\n\n🤖 TECHNOLOGY\nEU passes landmark AI regulation bill. Tech giants face fines up to 6% of global revenue.\n\n🎬 CULTURE\nOur critics' picks: the 10 best films to watch this weekend.\n\n📖 READER FAVOURITE\n'How I quit social media for a year — and what I learned'\n\nRead more on TheGuardian.com →"),

            # ─── MORE NEWSLETTER SOURCES (for richer demo carousel) ───
            m("Korben <newsletter@korben.info>",
              "L'IA génère des images, mais sait-elle pourquoi ?",
              "Cette semaine : un nouveau framework CSS qui défie Tailwind, le retour du RSS dans les apps modernes, et mon avis sur le dernier raspberry pi. Bonne lecture !",
              True, False, False, 0, 4, "standalone",
              text="Salut,\n\nAu programme cette semaine :\n\n🤖 IA — Les modèles génératifs savent créer des images mais comprennent-ils ce qu'ils dessinent ? Une étude fascinante.\n\n🎨 CSS — Un nouveau framework challenger Tailwind promet des bundles 60% plus légers. J'ai testé.\n\n🥧 RASPBERRY PI — Le RPi 6 est sorti. 16 Go de RAM, USB4, et un prix qui pique un peu.\n\n📡 RSS — Le retour du bon vieux RSS dans les apps modernes. Pourquoi ça fait sens.\n\nBonne lecture,\nKorben"),
            m("Korben <newsletter@korben.info>",
              "J'ai testé le clavier du futur (spoiler : il n'a pas de touches)",
              "Retour d'expérience sur le Keyboard 2.0 de KLC — un écran tactile qui remplace les touches. Brillant ou gadget ? Aussi : le Pi Pico fait mieux que l'Arduino.",
              True, False, False, 0, 3, "standalone",
              text="Salut,\n\nCette semaine, j'ai testé le Keyboard 2.0 de Keyberon Labs — un clavier entièrement tactile avec retour haptique.\n\nMon avis : c'est magnifique, mais est-ce que ça tape mieux qu'un bon vieux Mechanical ? La réponse va vous surprendre (ou pas).\n\nAussi dans cette édition :\n- Le Pi Pico W2 fait mieux que l'Arduino pour 5€ de moins\n- Comment j'ai hacké ma box internet pour avoir la fibre gratuite\n- Un émulateur de GameBoy qui tourne dans le navigateur\n\nÀ la semaine prochaine,\nKorben"),
            m("Product Hunt <hello@producthunt.com>",
              "Weekly digest: AI design tool takes the crown",
              "This week's top launches: an AI design tool that converts Figma to code, a new Rust-based bundler, and a privacy-first analytics platform. See the full ranking.",
              True, False, False, 0, 2, "standalone",
              text="Hi there,\n\nThis week's top products on Product Hunt:\n\n🥇 **DesignToCode AI** — Convert Figma designs to production-ready React code. 2 847 upvotes.\n🥇 **Ruspack** — A Rust-based JS bundler that's 10x faster than Webpack. 2 312 upvotes.\n🥇 **Prixy Analytics** — Privacy-first analytics with zero cookie consent needed. 1 893 upvotes.\n\n📊 This week's stats:\n- 147 products launched this week\n- Most popular category: Developer Tools\n- Trending: AI + productivity\n\nSee the full ranking on Product Hunt →\n\n👋 The Product Hunt Team"),
            m("Dribbble <hello@dribbble.com>",
              "Weekly pick: The best UI designs of the month",
              "This month's top dribbbles feature a stunning dashboard redesign, a brutalist e-commerce concept, and 12 micro-interaction videos you need to see. Curated by our editors.",
              True, False, False, 0, 2, "standalone",
              text="Hey there,\n\nThis week's curated picks from Dribbble:\n\n🏆 Shot of the Week: \"Dark Dashboard Redesign\" by @uiux.jordan — 2 847 ❤️\n\n🔥 Trending this month:\n- Brutalist e-commerce concept by @studio.mono\n- 12 micro-interaction videos in one shot by @motion.magic\n- Design system component library by @design.systems\n\n📈 By the numbers:\n- 12 847 new shots this week\n- Most popular tag: #darkmode\n- Most popular color: #6C63FF\n\nSee the full collection on Dribbble →\n\nHappy designing,\nThe Dribbble Team"),
            m("Tailwind Weekly <newsletter@tailwindlabs.com>",
              "Tailwind CSS v4.2: Container queries, new color palette, and more",
              "The new version brings official container query support, a refreshed color palette with 120 new colors, improved dark mode, and a new CLI with watch mode. Upgrade guide inside.",
              True, False, False, 0, 1, "standalone",
              text="Hey Tailwind fans!\n\nTailwind CSS v4.2 is here with some major additions:\n\n📦 **Container Queries** — Officially supported! Use @sm, @md, @lg breakpoints based on container width. No plugins needed.\n\n🎨 **New Color Palette** — 120 new colors added to the default palette. Fresh teals, warm corals, and deep indigos.\n\n🌙 **Dark Mode v2** — Simpler API: just add `dark` to your config. Automatic class-based switching.\n\n⚡ **New CLI** — Built-in watch mode, better HMR, and faster builds.\n\nSee the full changelog and upgrade guide →\n\nKeep styling,\nThe Tailwind Labs Team"),
            m("Brut. <newsletter@brut.media>",
              "Ils ont changé le monde : le dernier épisode est en ligne",
              "Brut. vous présente le portrait de Fatoumata, 24 ans, qui révolutionne l'agriculture en Afrique avec des drones low-cost. Un film de 12 minutes à ne pas manquer.",
              True, False, False, 0, 1, "standalone",
              text="Bonjour,\n\nNouvel épisode Brut. disponible :\n\n🎬 \"Fatoumata, la paysanne du futur\"\n— 24 ans\n— A inventé un drone agricole low-cost en assemblant des pièces de smartphone\n— Déjà utilisée par 300 fermiers au Sénégal\n— Objectif : équiper 10 000 fermes d'ici 2028\n\nUn film de 12 minutes tourné sur 6 mois.\n\nÀ regarder sur Brut. →\n\nL'équipe Brut."),
        ]
    else:
        # pro account
        entries = [
            # ─── CONV 101 : Appel d'offres (4 msgs, PRIMARY) ───
            m("Sophie Mercier <sophie.mercier@entreprise.fr>",
              "Appel d'offres — Refonte CRM interne",
              "Bonjour Clément, suite à votre candidature, nous avons le plaisir de vous inviter à participer à notre appel d'offres pour la refonte de notre CRM interne. Délai de réponse : 15 juillet. Cahier des charges ci-joint.",
              False, True, True, 1, 5, "conv-rfp",
              text="Bonjour Clément,\n\nSuite à votre candidature spontanée, nous avons le plaisir de vous inviter à participer à notre appel d'offres pour la refonte de notre CRM internal.\n\nPérimètre :\n- Dashboard commercial avec KPIs en temps réel\n- Gestion des leads et pipeline de vente\n- Intégration HubSpot et Salesforce\n- Interface mobile responsive\n\nDélai de réponse : 15 juillet 2026\nCachet : 35 000€ à 50 000€ HT selon périmètre\n\nCahier des charges détaillé en pièce jointe.\n\nCordialement,\nSophie Mercier — DSI @ Groupe Entreprise"),
            m("Sophie Mercier <sophie.mercier@entreprise.fr>",
              "Re: Appel d'offres — Votre proposition reçue",
              "Nous avons bien reçu votre proposition pour l'AO CRM. Félicitations, vous faites partie des 3 finalistes ! Nous aimerions organiser une présentation de 30min la semaine prochaine.",
              False, False, False, 0, 3, "conv-rfp",
              text="Bonjour Clément,\n\nNous avons bien reçu votre proposition pour l'appel d'offres CRM. Merci pour la qualité du dossier.\n\nFélicitations — vous faites partie des 3 finalistes retenus !\n\nNous aimerions organiser une présentation orale de 30 minutes la semaine prochaine pour que vous puissiez détailler votre approche et répondre à nos questions.\n\nDisponibilités ?\n\nCordialement,\nSophie Mercier"),
            m("Sophie Mercier <sophie.mercier@entreprise.fr>",
              "Re: Appel d'offres — Félicitations !",
              "C'est officiel : vous êtes retenu pour la refonte de notre CRM ! 🎉 Nous sommes impatients de travailler avec vous. Un premier call de kickoff est à organiser dès que possible.",
              True, True, False, 0, 1, "conv-rfp",
              text="Bonjour Clément,\n\nC'est officiel : vous êtes retenu pour la refonte de notre CRM interne ! 🎉\n\nL'ensemble du comité de sélection a été conquis par votre présentation et votre approche centrée utilisateur.\n\nNous sommes impatients de travailler avec vous !\n\nProchaines étapes :\n1. Kickoff call (1h) — à organiser cette semaine\n2. Atelier de cadrage (demi-journée)\n3. Début du design sprint\n\nDisponible pour un call demain ou jeudi ?\n\nSophie"),

            # ─── CONV 102 : Sprint planning (3 msgs, PRIMARY) ───
            m("Marc Leblanc <marc.leblanc@entreprise.fr>",
              "Sprint Planning #24 — Mercredi 10h",
              "Hello ! Voici l'invitation pour le sprint planning de demain. On doit prioriser les tickets pour les 2 semaines à venir. N'oubliez pas de mettre à jour vos tickets avant la réunion.",
              True, False, False, 0, 4, "conv-sprint",
              text="Hello l'équipe !\n\nRappel : Sprint Planning #24 demain à 10h00\n\n📍 Salle Visio A (lien Meet en calendrier)\n⏱️ Durée : 2h max\n\nPréparation :\n- Merci de mettre à jour vos tickets dans Linear avant la réunion\n- Les tickets non estimés ne seront pas inclus dans le sprint\n- Préparez vos questions pour le PO\n\nObjectifs du sprint :\n- Finaliser le module d'authentification\n- Déployer la V2 du dashboard\n- Corriger les bugs critiques remontés par le support\n\nÀ demain !\nMarc"),
            m("Marc Leblanc <marc.leblanc@entreprise.fr>",
              "Compte-rendu Sprint Planning #24",
              "Voici le compte-rendu du sprint planning. 18 tickets chargés (45 story points). Sprint goal : 'Authentification V2 + Dashboard final'. Les specs sont dans Linear. Bon sprint à tous !",
              True, False, False, 0, 2, "conv-sprint",
              text="Compte-rendu Sprint Planning #24\n\n📅 Chargé : 18 tickets / 45 story points\n🎯 Sprint Goal : \"Authentification V2 + Dashboard final\"\n\nRépartition :\n- Frontend : 8 tickets (20 pts) — Clément, Julie\n- Backend : 6 tickets (15 pts) — Thomas, Sarah\n- DevOps : 2 tickets (5 pts) — Mike\n- Design : 2 tickets (5 pts) — Julie\n\nDates :\n- Début : aujourd'hui\n- Review : 13 juillet 14h\n- Rétro : 14 juillet 11h\n\nLet's go ! 💪\nMarc"),

            # ─── CONV 103 : Client meeting (4 msgs, PRIMARY) ───
            m("Julie Renard <julie.renard@client-abc.com>",
              "Compte-rendu réunion client — Dashboard analytics",
              "Bonjour Clément, suite à notre réunion de ce matin, voici le compte-rendu avec les actions à prendre. Le client valide les maquettes mais demande une version alternative pour la page des rapports.",
              True, False, True, 2, 7, "conv-client",
              text="Bonjour Clément,\n\nSuite à notre réunion client de ce matin, voici le compte-rendu.\n\nParticipants : Client ABC (Julie R., Marc D.) + Notre équipe (Clément, Sarah)\n\nDécisions :\n- ✅ Maquettes dashboard validées\n- ⏳ Page rapports : le client demande une version alternative avec plus de graphiques\n- ❌ Proposition de refonte du menu refusée (trop de changement pour les utilisateurs)\n\nActions :\n- Clément : préparer V2 de la page rapports pour vendredi\n- Sarah : vérifier les données disponibles pour les nouveaux graphiques\n- Julie : envoyer les CR à toute l'équipe\n\nCompte-rendu détaillé en pièce jointe.\n\nJulie"),
            m("Julie Renard <julie.renard@client-abc.com>",
              "Re: Dashboard — Retours client sur la V2",
              "Le client vient d'envoyer ses retours sur la V2 des rapports. Globalement positif ! Quelques ajustements demandés : couleurs des charts, labels plus gros, filtre par date à ajouter.",
              True, False, True, 1, 4, "conv-client",
              text="Bonjour Clément,\n\nLe client a envoyé ses retours sur la V2 de la page rapports.\n\nGlobalement : très positif ! 🎉\n\nAjustements demandés :\n1. Modifier les couleurs des charts pour suivre leur charte graphique (le fichier joint)\n2. Labels des axes en 14px minimum (accessibilité)\n3. Ajouter un filtre par date sur tous les graphiques\n4. Option d'export PDF à prévoir pour V3\n\nLe fichier PDF avec les annotations est en pièce jointe.\n\nEst-ce que tu peux faire ces ajustements pour la fin de semaine ?\n\nJulie"),

            # ─── CONV 104 : Tech newsletter (3 msgs, PROMOTIONS) ───
            m("Tech Weekly <newsletter@techweekly.io>",
              "This Week in Tech: React 19, CSS Layers, AI Tools",
              "React 19 is now stable! Plus: a deep dive into CSS Cascade Layers, the best AI tools for designers in 2026, and why everyone is talking about HTMX. Read the full issue →",
              True, False, False, 0, 10, "conv-tech-nl",
              text="Tech Weekly — Issue #284\n\n🚀 REACT 19\nReact 19 is now stable! Key features: Server Components, Actions, New Hooks (use, useOptimistic). Migration guide inside.\n\n🎨 CSS\nA complete guide to CSS Cascade Layers (@layer) — how to finally tame specificity.\n\n🤖 AI TOOLS\nThe best AI tools for designers and developers in 2026: our curated list of 15 essential tools.\n\n🔧 HTMX\nWhy everyone is talking about HTMX. Is it the end of SPAs? We investigate.\n\nRead the full issue on TechWeekly.io →"),
            m("Tech Weekly <newsletter@techweekly.io>",
              "JavaScript Runtimes Compared: Node vs Deno vs Bun",
              "We benchmarked all three runtimes. Results might surprise you. Also: CSS container queries in production, and the rise of edge computing. Read on.",
              True, False, False, 0, 5, "conv-tech-nl",
              text="Tech Weekly — Issue #285\n\n⚡ JAVASCRIPT RUNTIMES\nNode.js vs Deno vs Bun — we benchmarked all three on startup time, throughput, and memory usage. Full results inside.\n\n📐 CSS CONTAINER QUERIES\nReal-world production case study: how we reduced layout code by 60% using container queries.\n\n🌐 EDGE COMPUTING\nThe rise of edge computing: when to use it, when to stick with traditional servers.\n\nRead the full issue on TechWeekly.io →"),
            m("Tech Weekly <newsletter@techweekly.io>",
              "The State of TypeScript 2026",
              "TypeScript 6.0 features, strict mode best practices, and the growing divide between TypeScript and plain JavaScript ecosystems. Our annual survey results inside.",
              True, False, False, 0, 1, "conv-tech-nl",
              text="Tech Weekly — Issue #286\n\n📘 THE STATE OF TYPESCRIPT 2026\nOur annual survey is back! 15,000+ developers responded.\n\nKey findings:\n- 92% use strict mode (up from 78% in 2024)\n- TypeScript 6.0 features: sealed types, improved inference\n- The ecosystem divide: more libs going TypeScript-first\n\n🏗️ ARCHITECTURE\nMonorepos: are they worth it? A balanced analysis of Turborepo, Nx, and pnpm workspaces.\n\nRead the full issue on TechWeekly.io →"),

            # ─── STANDALONE pro ───
            m("HubSpot <notifications@hubspot.com>",
              "⚡ Nouveau lead : SARL Batimat — 3M€ CA",
              "Un nouveau lead a été ajouté au pipeline. SARL Batimat (contact@batimat.fr) a téléchargé votre livre blanc. Score : 85/100. Contacter maintenant.",
              False, True, False, 0, 2, "standalone",
              text="Nouveau lead HubSpot\n\n🏢 SARL Batimat\n📍 Lyon\n💰 CA : 3 000 000€\n👤 Contact : Jean-Pierre Morel (contact@batimat.fr)\n📞 Tél : 04 78 XX XX XX\n\nSource : Téléchargement livre blanc 'CRM 2026'\nScore : 85/100 🔥\nPipeline : Qualification → Proposition\n\nContacter → | Voir dans HubSpot →"),
            m("Intercom <messages@intercom.com>",
              "Nouveau message de Thomas (Client ABC) — Urgent",
              "Thomas a écrit : 'Bonjour, la page de connexion ne fonctionne plus depuis la mise à jour de ce matin. Message d'erreur 503. Pouvez-vous regarder en urgence ?'",
              False, False, False, 0, 1, "standalone",
              text="Nouveau message Intercom\n\nDe : Thomas Petit (Client ABC) ⚠️\n\n\"Bonjour,\n\nLa page de connexion à notre dashboard ne fonctionne plus depuis la mise à jour de ce matin. On a un message d'erreur 503 sur toutes les tentatives.\n\nCertains utilisateurs commencent à râler — pouvez-vous regarder ça en urgence ?\"\n\nRépondre → | Résoudre →"),
            m("Mailchimp <noreply@mailchimp.com>",
              "Campagne 'Newsletter Juillet' — Rapport d'envoi",
              "Votre campagne a été envoyée à 2 847 abonnés. Taux d'ouverture : 34.2% (moyenne 22.5%). Taux de clic : 5.8%. 12 désabonnements. Consultez le rapport complet.",
              True, False, False, 0, 3, "standalone",
              text="Rapport de campagne Mailchimp\n\n📧 Campagne : Newsletter Juillet 2026\n👥 Envoyée à : 2 847 abonnés\n📊 Taux d'ouverture : 34.2% ✅ (moyenne industrie : 22.5%)\n🖱️ Taux de clic : 5.8% (meilleur article : \"Guide du Design System\")\n🚫 Désabonnements : 12 (0.4%)\n\nArticles les plus cliqués :\n1. \"Guide du Design System\" — 42% des clics\n2. \"Retour d'expérience : Notion pour la gestion de projet\" — 28%\n3. \"Les tendances UI 2026\" — 18%\n\nVoir le rapport complet →"),
            m("Stripe <payouts@stripe.com>",
              "Virement Stripe de 4 837,00€ envoyé",
              "Un virement de 4 837,00€ a été émis sur votre compte bancaire (••••3842). Période : 1-15 juin 2026. Reçu disponible dans votre dashboard Stripe.",
              True, False, True, 1, 8, "standalone",
              text="Virement Stripe effectué\n\n💰 Montant : 4 837,00€\n🏦 Compte : Banque ***3842\n📅 Période : 1er au 15 juin 2026\n\nDétail des transactions :\n- Sophie Lambert : 249,00€\n- Marie Lefèvre : 89,00€\n- Entreprise SAS : 1 200,00€\n- Client ABC : 2 500,00€\n- Autres : 799,00€\n\nFrais Stripe : -122,34€ (2.5%)\nNet : 4 714,66€\n\nReçu disponible sur Stripe →"),
            m("Trello <notifications@trello.com>",
              "Carte 'Finaliser page contact' déplacée vers 'En cours'",
              "Sarah a déplacé la carte 'Finaliser page contact responsive' de la liste 'À faire' vers 'En cours' dans le tableau 'Site vitrine — Développement'.",
              True, False, False, 0, 4, "standalone",
              text="Mouvement sur Trello\n\n📋 Tableau : Site vitrine — Développement\n📌 Carte : Finaliser page contact responsive\n\nDe : À faire → En cours\n\nPar : Sarah Benali\n\nMembres de la carte : Clément, Sarah\n\nVoir dans Trello →"),
            m("Docker Hub <notifications@docker.com>",
              "Image docker/clément-site:latest build réussi",
              "Le build automatique de votre image Docker s'est terminé avec succès. Tags : clément-site:latest, clément-site:1.4.2. Taille : 342MB.",
              True, False, False, 0, 6, "standalone",
              text="Docker Hub — Build réussi ✅\n\nRepository : clément-site/backend\nTag : latest, 1.4.2\nTaille : 342 MB\nDurée : 3 min 42 sec\n\nCommits :\n- a3f8b21 : Fix CORS headers\n- 7e2d94a : Update dependencies\n- 1c5a8ef : Add health check endpoint\n\nVoir sur Docker Hub →"),
            m("Google Workspace <alert@google.com>",
              "Espace de stockage Google presque plein (92%)",
              "Votre espace Google Workspace est utilisé à 92% (13.8 Go / 15 Go). Pensez à libérer de l'espace ou à passer à un forfait supérieur pour 2,99€/mois supplémentaire.",
              True, False, False, 0, 5, "standalone",
              text="Alerte stockage Google Workspace\n\n📊 Utilisation : 13.8 Go / 15 Go (92%)\n\nVentilation :\n- Gmail : 4.2 Go\n- Google Drive : 8.1 Go\n- Google Photos : 1.5 Go\n\nRecommandation : libérer de l'espace ou passer au forfait 30 Go (2,99€/mois supplémentaire).\n\nGérer le stockage →"),
            m("Calendly <noreply@calendly.com>",
              "Nouveau rendez-vous confirmé : Client ABC — Réunion suivi",
              "Votre rendez-vous avec Client ABC est confirmé. Date : Jeudi 2 juillet 2026, 14h00-15h00 (UTC+2). Lien visio : https://meet.google.com/abc-defg-hij",
              False, False, False, 0, 2, "standalone",
              text="Rendez-vous confirmé ✅\n\n📅 Jeudi 2 juillet 2026\n⏰ 14h00 - 15h00 (UTC+2)\n👥 Julie Renard (Client ABC), Marc Leblanc, Clément\n\n📍 Google Meet : https://meet.google.com/abc-defg-hij\n📝 Ordre du jour :\n- Suivi des maquettes V2\n- Validation du planning\n- Questions techniques\n\nAjouter au calendrier →"),
            m("Typeform <noreply@typeform.com>",
              "Nouvelle réponse : Satisfaction client — Note 9/10",
              "Un client a répondu à votre enquête de satisfaction. Note : 9/10. Commentaire : 'Excellent travail, très professionnel, je recommande !'",
              True, False, False, 0, 7, "standalone",
              text="Nouvelle réponse Typeform\n\n📋 Enquête : Satisfaction client — Projet CRM\n⭐ Note : 9/10 🎉\n\nCommentaire : \"Excellent travail, très professionnel. Communication fluide et livrables de grande qualité. Je recommande sans hésitation !\"\n\nVoir les réponses →"),
            m("Google Analytics <noreply@google.com>",
              "Rapport mensuel — clément-mondary.design",
              "Votre site a reçu 3 247 visiteurs ce mois-ci (+12% vs mois dernier). Pages vues : 8 942. Temps moyen : 3m42s. Taux de rebond : 38.5%. Top page : /portfolio.",
              True, False, False, 0, 9, "standalone",
              text="Rapport Google Analytics — Juin 2026\n\n🌐 Site : clément-mondary.design\n\n📈 Visiteurs : 3 247 (+12% vs mai)\n👀 Pages vues : 8 942\n⏱️ Temps moyen : 3 min 42 secondes\n↩️ Taux de rebond : 38.5% ✅\n\nTop pages :\n1. /portfolio — 1 284 vues\n2. / — 892 vues\n3. /contact — 445 vues\n4. /apropos — 312 vues\n\nAcquisition :\n- Recherche organique : 45%\n- Direct : 28%\n- Réseaux sociaux : 15%\n- Référencement : 12%\n\nVoir le rapport complet →"),
        ]

    msgs = []
    for e in entries:
        msgs.append(e)

    return msgs


# ---------- Routes ----------

@app.get("/")
def index():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/icon.png")
def serve_icon():
    return FileResponse(BASE_DIR / "icon.png", media_type="image/png")


@app.get("/bg.jpg")
def serve_bg():
    return FileResponse(BASE_DIR / "bg.jpg", media_type="image/jpeg")


@app.get("/api/accounts")
def accounts():
    out = []
    try:
        cfg = load_config(configured_only=True)
        for a in cfg.get("accounts", []):
            out.append({
                "id": a["id"],
                "name": a.get("name", a["id"]),
                "email": a["imap"]["user"],
            })
    except Exception:
        pass
    out.extend(DEMO_ACCOUNTS)
    return out


@app.get("/api/accounts/all")
def accounts_all():
    raw_cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    cfg = load_config(configured_only=False)
    raw_by_id = {a.get("id"): a for a in raw_cfg.get("accounts", [])}
    out = []
    for a in cfg.get("accounts", []):
        connected = _account_is_configured(a)
        raw = raw_by_id.get(a.get("id"), {})

        def public_server(section: str):
            values = a.get(section, {})
            raw_password = raw.get(section, {}).get("password", "")
            match = re.fullmatch(r"\$\{([^}]+)\}", raw_password) if isinstance(raw_password, str) else None
            return {
                "host": values.get("host", ""),
                "port": values.get("port"),
                "ssl": bool(values.get("ssl", True)),
                "user": values.get("user", ""),
                "password_env": match.group(1) if match else "",
                "password_configured": bool(values.get("password")),
            }

        out.append({
            "id": a["id"],
            "name": a.get("name", a["id"]),
            "email": a["imap"]["user"],
            "connected": connected,
            "imap": public_server("imap"),
            "smtp": public_server("smtp"),
        })
    for d in DEMO_ACCOUNTS:
        out.append({**d, "connected": d.get("connected", False)})
    return out


class CreateAccountRequest(BaseModel):
    name: str
    email: str
    imap_host: str
    imap_port: int = 993
    imap_ssl: bool = True
    imap_password: str
    smtp_host: str
    smtp_port: int = 465
    smtp_ssl: bool = True
    smtp_password: str


class UpdateAccountRequest(BaseModel):
    name: str
    email: str
    imap_host: str
    imap_port: int = 993
    imap_ssl: bool = True
    imap_password: str = ""
    smtp_host: str
    smtp_port: int = 465
    smtp_ssl: bool = True
    smtp_password: str = ""


def _raw_config():
    return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))


def _secret_variable(raw_password, fallback):
    match = re.fullmatch(r"\$\{([A-Za-z_][A-Za-z0-9_]*)\}", raw_password or "")
    return match.group(1) if match else fallback


def _write_secret(variable: str, value: str):
    if not value:
        return
    if any(char in value for char in ("\r", "\n", "\0")):
        raise HTTPException(status_code=400, detail="Mot de passe invalide")
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", variable):
        raise HTTPException(status_code=400, detail="Nom de variable secret invalide")
    SECRETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    lines = SECRETS_PATH.read_text(encoding="utf-8").splitlines() if SECRETS_PATH.exists() else []
    lines = [line for line in lines if not line.startswith(f"{variable}=")]
    lines.append(f"{variable}={value}")
    SECRETS_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")
    os.environ[variable] = value


@app.post("/api/accounts")
def create_account(body: CreateAccountRequest):
    aid = re.sub(r"[^a-z0-9]+", "", body.name.lower().replace(" ", "")) or re.sub(r"[^a-z0-9]+", "", body.email.split("@")[0].lower())
    cfg = _raw_config()
    if any(a["id"] == aid for a in cfg.get("accounts", [])):
        raise HTTPException(status_code=409, detail=f"Le compte '{aid}' existe déjà")

    pw_var_imap = f"{aid.upper()}_IMAP_PASSWORD"
    pw_var_smtp = f"{aid.upper()}_SMTP_PASSWORD"

    _write_secret(pw_var_imap, body.imap_password)
    _write_secret(pw_var_smtp, body.smtp_password)

    new_account = {
        "id": aid,
        "name": body.name,
        "imap": {
            "host": body.imap_host,
            "port": body.imap_port,
            "ssl": body.imap_ssl,
            "user": body.email,
            "password": f"${{{pw_var_imap}}}",
        },
        "smtp": {
            "host": body.smtp_host,
            "port": body.smtp_port,
            "ssl": body.smtp_ssl,
            "user": body.email,
            "password": f"${{{pw_var_smtp}}}",
        },
    }
    cfg["accounts"].append(new_account)
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    threading.Thread(
        target=idle_worker, args=(get_account(aid),), daemon=True, name=f"idle-{aid}"
    ).start()

    return {"ok": True, "id": aid, "connected": True}


@app.patch("/api/accounts/{account_id}")
def update_account(account_id: str, body: UpdateAccountRequest):
    cfg = _raw_config()
    account = next((item for item in cfg.get("accounts", []) if item.get("id") == account_id), None)
    if account is None:
        raise HTTPException(status_code=404, detail=f"Compte '{account_id}' inconnu")

    imap_variable = _secret_variable(
        account.get("imap", {}).get("password", ""), f"{account_id.upper()}_IMAP_PASSWORD"
    )
    smtp_variable = _secret_variable(
        account.get("smtp", {}).get("password", ""), f"{account_id.upper()}_SMTP_PASSWORD"
    )
    _write_secret(imap_variable, body.imap_password)
    _write_secret(smtp_variable, body.smtp_password)

    account["name"] = body.name.strip() or account_id
    account["imap"] = {
        "host": body.imap_host.strip(), "port": body.imap_port, "ssl": body.imap_ssl,
        "user": body.email.strip(), "password": f"${{{imap_variable}}}",
    }
    account["smtp"] = {
        "host": body.smtp_host.strip(), "port": body.smtp_port, "ssl": body.smtp_ssl,
        "user": body.email.strip(), "password": f"${{{smtp_variable}}}",
    }
    CONFIG_PATH.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    expanded = next(item for item in load_config(False)["accounts"] if item.get("id") == account_id)
    return {"ok": True, "id": account_id, "connected": _account_is_configured(expanded)}

@app.get("/api/accounts/{account_id}/folders")
def folders(account_id: str):
    if _is_demo() or _is_demo_account(account_id):
        return DEMO_FOLDERS.get(account_id, [])
    account = get_account(account_id)
    with open_mailbox(account) as mailbox:
        result = []
        # Prioriser les dossiers communs
        order = ["INBOX", "Sent", "Drafts", "Trash", "Junk", "Spam", "Archive"]
        for folder in mailbox.folder.list():
            name = folder.name
            try:
                status = mailbox.folder.status(name)
            except Exception:
                status = {}
            result.append({
                "name": name,
                "unseen": status.get("UNSEEN", 0),
                "total": status.get("MESSAGES", 0),
            })
        result.sort(key=lambda f: _folder_key(f["name"], order))
        return result


@app.post("/api/accounts/{account_id}/folders")
def create_folder(account_id: str, body: FolderCreateRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Le nom du libellé est requis")
    if any(ch in name for ch in ("\r", "\n", "\0")):
        raise HTTPException(status_code=400, detail="Nom de libellé invalide")
    account = get_account(account_id)
    with open_mailbox(account) as mailbox:
        if mailbox.folder.exists(name):
            raise HTTPException(status_code=409, detail=f"Le libellé '{name}' existe déjà")
        mailbox.folder.create(name)
    return {"ok": True, "name": name}


def _sanitize_folder_name(name: str) -> str:
    value = (name or "").strip()
    if not value:
        raise HTTPException(status_code=400, detail="Le nom du dossier est requis")
    if any(ch in value for ch in ("\r", "\n", "\0")):
        raise HTTPException(status_code=400, detail="Nom de dossier invalide")
    return value


def _ensure_folder_exists(mailbox, name: str, create_if_missing: bool = True) -> str:
    target = _sanitize_folder_name(name)
    if mailbox.folder.exists(target):
        return target
    if not create_if_missing:
        raise HTTPException(status_code=404, detail=f"Le dossier '{target}' est introuvable")
    mailbox.folder.create(target)
    return target


def _relocate_message(account: str, uid: str, source_folder: str, destination_folder: str, copy_only: bool = False, create_if_missing: bool = True):
    acc = get_account(account)
    source = _sanitize_folder_name(source_folder)
    destination = _sanitize_folder_name(destination_folder)
    if source == destination and not copy_only:
        raise HTTPException(status_code=400, detail="Le dossier source et le dossier de destination sont identiques")
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(source)
        dest = _ensure_folder_exists(mailbox, destination, create_if_missing=create_if_missing)
        if copy_only:
            mailbox.copy(uid, dest)
        else:
            mailbox.move(uid, dest)
    cache_invalidate(account, source, uid)
    if copy_only:
        cache_invalidate(account, dest)
    return {"ok": True, "account": account, "uid": str(uid), "source_folder": source, "destination_folder": dest, "copied": copy_only}


def _folder_key(name: str, order: list[str]):
    name_low = name.lower()
    for i, o in enumerate(order):
        if name_low == o.lower() or name_low.endswith("/" + o.lower()):
            return (0, i)
    return (1, name.lower())


@app.get("/api/messages")
def list_messages(
    account: str = Query(...),
    folder: str = Query("INBOX"),
    q: str = Query(""),
    page: int = Query(1, ge=1),
    page_size: int = Query(40, ge=1, le=120),
    unseen: bool = Query(False),
):
    if _is_demo() or _is_demo_account(account):
        msgs = _demo_messages(account, folder)
        if unseen:
            msgs = [m for m in msgs if not m["seen"]]
        if q:
            ql = q.lower()
            msgs = [m for m in msgs if ql in m["subject"].lower() or ql in m["snippet"].lower() or ql in m["from_name"].lower()]
        return {"messages": msgs, "page": page}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        kwargs = {}
        if q:
            kwargs["text"] = q
        if unseen:
            kwargs["seen"] = False
        criteria = AND(**kwargs) if kwargs else AND(all=True)

        msgs = []
        offset = (page - 1) * page_size
        fetched = mailbox.fetch(
            criteria,
            limit=page_size + offset,
            reverse=True,
            mark_seen=False,
            bulk=True,
            headers_only=False,
        )
        for i, msg in enumerate(fetched):
            if i < offset:
                continue
            from_name, from_addr = parseaddr(msg.from_)
            snippet = ""
            if msg.text:
                snippet = " ".join(msg.text.split())[:160]
            elif msg.html:
                snippet = _strip_html(msg.html)[:160]
            msgs.append({
                "account": account,
                "uid": str(msg.uid),
                "subject": msg.subject or "(sans objet)",
                "from_name": from_name or from_addr,
                "from_addr": from_addr,
                "date": msg.date.isoformat() if msg.date else None,
                "seen": "\\Seen" in [str(f) for f in msg.flags],
                "flagged": "\\Flagged" in [str(f) for f in msg.flags],
                "has_attachments": len(msg.attachments) > 0,
                "attachment_count": len(msg.attachments),
                "snippet": snippet,
                "message_id": header_value(msg.headers, "message-id"),
            })
        # V22 : catégories heuristiques + threading (THREAD=REFERENCES avec repli sujet)
        thread_map = _compute_threads(account, mailbox, folder, msgs)
        for m in msgs:
            m["category"] = _categorize(m["from_addr"], m["from_name"], m["subject"])
            m["thread_id"] = thread_map.get(m["uid"], m["uid"])
        return {"messages": msgs, "page": page}


@app.get("/api/messages/{account}/{uid}")
def get_message(account: str, uid: str, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        msgs = _demo_messages(account, folder)
        for m in msgs:
            if m["uid"] == uid:
                return m
        raise HTTPException(status_code=404, detail="Message introuvable")
    ck = _cache_key(account, folder, uid)
    cached = cache_get(ck)
    if cached is not None:
        return cached
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        msg = _find_message(mailbox, uid)
        if msg is None:
            raise HTTPException(status_code=404, detail="Message introuvable")
        from_name, from_addr = parseaddr(msg.from_)
        attachments = []
        for idx, att in enumerate(msg.attachments):
            attachments.append({
                "index": idx,
                "filename": att.filename or "sans-nom",
                "content_type": att.content_type,
                "size": len(att.payload) if att.payload else 0,
                "content_id": att.content_id,
            })
        result = {
            "account": account,
            "uid": str(msg.uid),
            "subject": msg.subject or "(sans objet)",
            "from_name": from_name or from_addr,
            "from_addr": from_addr,
            "to": header_value(msg.headers, "to"),
            "cc": header_value(msg.headers, "cc"),
            "date": msg.date.isoformat() if msg.date else None,
            "seen": "\\Seen" in [str(f) for f in msg.flags],
            "flagged": "\\Flagged" in [str(f) for f in msg.flags],
            "text": msg.text or "",
            "html": msg.html or "",
            "message_id": header_value(msg.headers, "message-id"),
            "attachments": attachments,
        }
        cache_set(ck, result)
        return result


@app.get("/api/messages/{account}/{uid}/attachment/{index}")
def get_attachment(account: str, uid: str, index: int, folder: str = Query("INBOX")):
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        msg = _find_message(mailbox, uid)
        if msg is None:
            raise HTTPException(status_code=404, detail="Message introuvable")
        atts = list(msg.attachments)
        if index < 0 or index >= len(atts):
            raise HTTPException(status_code=404, detail="Pièce jointe introuvable")
        att = atts[index]
        return Response(
            content=att.payload,
            media_type=att.content_type or "application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{att.filename}"'
            },
        )


@app.get("/api/messages/{account}/{uid}/cid/{cid}")
def get_cid(account: str, uid: str, cid: str, folder: str = Query("INBOX")):
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        msg = _find_message(mailbox, uid)
        if msg is None:
            raise HTTPException(status_code=404, detail="Message introuvable")
        for att in msg.attachments:
            if att.content_id and att.content_id.strip("<>") == cid:
                return Response(content=att.payload, media_type=att.content_type)
        raise HTTPException(status_code=404, detail="Image introuvable")


@app.get("/api/og-image")
def get_og_image(domain: str = Query(...)):
    """Récupère l'og:image d'un domaine pour les newsletters."""
    import urllib.request, urllib.error
    domain = domain.strip().lower()
    if not domain or not "." in domain:
        raise HTTPException(status_code=400, detail="Domaine invalide")
    # Nettoyer le domaine
    clean = domain.replace("http://", "").replace("https://", "").split("/")[0]
    urls_to_try = [f"https://{clean}/", f"https://www.{clean}/"]
    for url in urls_to_try:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (compatible; MailClient/1.0)"})
            with urllib.request.urlopen(req, timeout=5) as resp:
                html = resp.read(50000).decode("utf-8", errors="ignore")
            # Chercher og:image
            m = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
            if not m:
                m = re.search(r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']', html, re.I)
            if not m:
                m = re.search(r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)["\']', html, re.I)
            if m:
                img = m.group(1).strip()
                if img.startswith("//"):
                    img = "https:" + img
                elif img.startswith("/"):
                    img = "https://" + clean + img
                return {"image": img}
        except Exception:
            continue
    return {"image": ""}


@app.patch("/api/messages/{account}/{uid}")
def update_flags(account: str, uid: str, body: FlagUpdate, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        flags_to_add = []
        flags_to_del = []
        if body.seen is not None:
            (flags_to_add if body.seen else flags_to_del).append(MailMessageFlags.SEEN)
        if body.flagged is not None:
            (flags_to_add if body.flagged else flags_to_del).append(MailMessageFlags.FLAGGED)
        if flags_to_add:
            mailbox.flag(uid, flags_to_add, True)
        if flags_to_del:
            mailbox.flag(uid, flags_to_del, False)
    cache_invalidate(account, folder, uid)
    return {"ok": True}


@app.delete("/api/messages/{account}/{uid}")
def delete_message(account: str, uid: str, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        mailbox.delete(uid)
    cache_invalidate(account, folder, uid)
    return {"ok": True}


@app.post("/api/messages/{account}/{uid}/move")
def move_message(account: str, uid: str, body: MoveMessageRequest, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    return _relocate_message(account, uid, folder, body.folder, copy_only=False, create_if_missing=body.create_if_missing)


@app.post("/api/messages/{account}/{uid}/copy")
def copy_message(account: str, uid: str, body: MoveMessageRequest, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    return _relocate_message(account, uid, folder, body.folder, copy_only=True, create_if_missing=body.create_if_missing)


def _folder_candidates(mailbox, preferred: str, aliases: list[str]):
    for name in [preferred, *aliases]:
        if mailbox.folder.exists(name):
            return name
    mailbox.folder.create(preferred)
    return preferred


@app.post("/api/messages/{account}/{uid}/archive")
def archive_message(account: str, uid: str, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        dest = _folder_candidates(mailbox, "Archive", ["INBOX.Archive", "Archived", "Archives"])
        mailbox.move(uid, dest)
    cache_invalidate(account, folder, uid)
    return {"ok": True, "destination_folder": dest}


@app.post("/api/messages/{account}/{uid}/spam")
def spam_message(account: str, uid: str, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        dest = _folder_candidates(mailbox, "Spam", ["Junk", "INBOX.Spam", "INBOX.Junk"])
        mailbox.move(uid, dest)
    cache_invalidate(account, folder, uid)
    return {"ok": True, "destination_folder": dest}


@app.post("/api/messages/{account}/{uid}/snooze")
def snooze_message(account: str, uid: str, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        dest = _folder_candidates(mailbox, "Snoozed", ["SNOOZED", "Waiting", "WAITING"])
        mailbox.move(uid, dest)
    cache_invalidate(account, folder, uid)
    return {"ok": True, "destination_folder": dest}


@app.post("/api/messages/{account}/{uid}/label")
def label_message(account: str, uid: str, body: MoveMessageRequest, folder: str = Query("INBOX")):
    if _is_demo() or _is_demo_account(account):
        return {"ok": True}
    return _relocate_message(account, uid, folder, body.folder, copy_only=True, create_if_missing=body.create_if_missing)

@app.post("/api/send")
def send_message(body: SendRequest):
    if _is_demo() or _is_demo_account(body.account):
        return {"ok": True}
    acc = get_account(body.account)
    msg = EmailMessage()
    msg["From"] = acc["imap"]["user"]
    msg["To"] = body.to
    if body.cc:
        msg["Cc"] = body.cc
    if body.bcc:
        msg["Bcc"] = body.bcc
    msg["Subject"] = body.subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=acc["imap"]["user"].split("@")[-1])
    if body.in_reply_to:
        msg["In-Reply-To"] = body.in_reply_to
        msg["References"] = body.references or body.in_reply_to

    if body.html:
        msg.set_content(body.text or _strip_html(body.html))
        msg.add_alternative(body.html, subtype="html")
    else:
        msg.set_content(body.text or "")

    if body.attachments:
        for att in body.attachments:
            data = base64.b64decode(att.get("data_b64", ""))
            ct = att.get("content_type", "application/octet-stream")
            maintype, _, subtype = ct.partition("/")
            msg.add_attachment(
                data,
                maintype=maintype or "application",
                subtype=subtype or "octet-stream",
                filename=att.get("filename", "fichier"),
            )

    refused = send_via_smtp(acc, msg)
    sent_folder = None
    sent_error = None
    # Stocker dans le dossier Envoyés si possible.
    try:
        with open_mailbox(acc) as mailbox:
            for sent_name in ("Sent", "INBOX.Sent", "Sent Items", "Boîte d'envoi"):
                if mailbox.folder.exists(sent_name):
                    mailbox.append(msg.as_bytes(), folder=sent_name, flag_set=[MailMessageFlags.SEEN])
                    sent_folder = sent_name
                    break
    except Exception as e:
        sent_error = str(e)
    return {
        "ok": True,
        "message_id": msg["Message-ID"],
        "refused": refused,
        "sent_folder": sent_folder,
        "sent_stored": sent_folder is not None,
        "sent_error": sent_error,
    }


# ---------- Helpers ----------

def _find_message(mailbox, uid):
    for msg in mailbox.fetch(AND(uid=str(uid)), limit=1, mark_seen=False, bulk=True):
        return msg
    return None


def _strip_html(html: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", html or "")
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    return " ".join(text.split())


# ---------- V22 : heuristic categories + IMAP threading ----------
# IMAP standard (o2switch/Dovecot) ne connaît pas les catégories Gmail.
# On les déduit côté serveur depuis l'expéditeur + le sujet.

_SOCIAL_DOMAINS = ("linkedin.com", "facebook.com", "twitter.com", "x.com", "instagram.com",
                   "tiktok.com", "youtube.com", "pinterest.com", "snapchat.com", "discord.com",
                   "mastodon", "vivaldi.net", "meetup.com")
_FORUM_DOMAINS = ("reddit.com", "stackoverflow.com", "stackexchange.com", "discourse",
                  "groups.google.com", "ycombinator.com", "forum", "discuss.")
_UPDATES_DOMAINS = ("github.com", "gitlab.com", "bitbucket.org", "stripe.com", "vercel.com",
                    "netlify.com", "apple.com", "microsoft.com", "amazon.com", "ovh.com",
                    "o2switch.net", "npmjs.com", "docker.com", "heroku.com", "linear.app",
                    "notion.so", "figma.com", "digitalocean.com", "google.com", "letskencrypt")
_PROMO_LOCALPARTS = ("newsletter", "no-reply", "noreply", "news@", "deals", "promo",
                     "marketing", "press@", "annonce")
_PROMO_SUBJECT = ("newsletter", "unsubscribe", "désabonnement", "se désabonner", "promotion",
                  "% off", "% de réduction", "réduction", "sondage", "digest", "weekly",
                  "briefing", "offre", "deal", "cashback", "soldes", "black friday",
                  "code promo", "votre récap")
_PURCHASE_SUBJECT = ("commande", "order", "facture", "invoice", "reçu", "receipt", "paiement",
                     "payment", "livraison", "expédié", "shipped", "achat", "purchase")
_PURCHASE_LOCALPARTS = ("orders", "order", "receipt", "receipts", "billing", "invoice")


def _categorize(from_addr: str, from_name: str, subject: str) -> str:
    addr = (from_addr or "").lower()
    name = (from_name or "").lower()
    subj = (subject or "").lower()
    domain = addr.split("@")[-1] if "@" in addr else addr
    local = addr.split("@")[0] if "@" in addr else ""

    if any(p in local for p in _PURCHASE_LOCALPARTS) or any(k in subj for k in _PURCHASE_SUBJECT):
        return "purchases"
    for d in _SOCIAL_DOMAINS:
        if d and d in domain:
            return "social"
    for d in _FORUM_DOMAINS:
        if d and (d in domain or d in name):
            return "forums"
    for d in _UPDATES_DOMAINS:
        if d and d in domain:
            # mais un reçu/facture reste une mise à jour, ok
            return "updates"
    if any(p in local for p in _PROMO_LOCALPARTS):
        return "promotions"
    if any(k in subj for k in _PROMO_SUBJECT):
        return "promotions"
    if any(k in name for k in ("newsletter", "news", "digest", "media", "studio")):
        return "promotions"
    return "primary"


# THREAD=REFERENCES : parse la réponse parenthésée de Dovecot
def _parse_thread_response(text: str):
    result, stack, buf = [], [], ""

    def flush():
        nonlocal buf
        if buf:
            if stack:
                stack[-1].append(buf)
            buf = ""

    for ch in text:
        if ch == "(":
            flush(); stack.append([])
        elif ch == ")":
            flush()
            grp = stack.pop()
            if not stack:
                result.append(grp)
            else:
                stack[-1].extend(grp)
        elif ch.isdigit():
            buf += ch
        else:
            flush()
    flush()
    return result


_THREAD_CACHE = {}  # (account, folder) -> (timestamp, {uid: thread_id})
_THREAD_TTL = 90


def _subject_thread_fallback(messages: list) -> dict:
    """Repli : groupe par sujet normalisé (Re:/Fwd:/Sv: retirés)."""
    groups = {}
    for m in messages:
        s = re.sub(r"(?i)^(re|fwd|fw|sv|tr)\s*:\s*", "", (m.get("subject") or "").strip())
        s = re.sub(r"\s+", " ", s).strip().lower()
        key = s or m["uid"]
        groups.setdefault(key, []).append(m["uid"])
    mapping = {}
    for uids in groups.values():
        tid = sorted(uids)[0]
        for u in uids:
            mapping[u] = tid
    return mapping


def _compute_threads(account: str, mailbox, folder: str, messages: list) -> dict:
    """Retourne {uid: thread_id}. Tente THREAD=REFERENCES, repli par sujet."""
    ck = (account, folder)
    cached = _THREAD_CACHE.get(ck)
    if cached and time.time() - cached[0] < _THREAD_TTL:
        return cached[1]

    mapping = {}
    try:
        typ, data = mailbox.client.thread("REFERENCES", "UTF-8", "ALL")
        if typ == "OK" and data:
            text = b"".join(data).decode("utf-8", errors="ignore")
            for grp in _parse_thread_response(text):
                if not grp:
                    continue
                tid = sorted(grp)[0]
                for uid in grp:
                    mapping[uid] = tid
    except Exception:
        mapping = {}

    if not mapping:
        mapping = _subject_thread_fallback(messages)

    _THREAD_CACHE[ck] = (time.time(), mapping)
    return mapping


_STATIC_BLOCKLIST = {"config.json", "config.example.json", "main.py", "requirements.txt", "start.sh", ".gitignore"}


@app.get("/{filename:path}")
def static_root(filename: str):
    target = (BASE_DIR / filename).resolve()
    if (
        target.is_file()
        and target.parent == BASE_DIR.resolve()
        and filename not in _STATIC_BLOCKLIST
        and not filename.startswith(".")
    ):
        return FileResponse(target)
    raise HTTPException(status_code=404, detail="Fichier introuvable")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

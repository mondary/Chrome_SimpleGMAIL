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
    attachments: Optional[list[dict]] = None  # [{filename, content_type, data_b64}]


class FlagUpdate(BaseModel):
    seen: Optional[bool] = None
    flagged: Optional[bool] = None


class FolderCreateRequest(BaseModel):
    name: str


# ---------- Demo mode ----------
def _demo_enabled():
    # V22 is intentionally real-account only. Never leak sample messages into
    # the same interface used for clement@mondary.design.
    return False


def _is_demo():
    return _demo_enabled()


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
    {"id": "perso", "name": "Perso", "email": "contact@mondomaine.fr"},
    {"id": "pro", "name": "Pro", "email": "moi@entreprise.com"},
]

DEMO_FOLDERS = {
    "perso": [
        {"name": "INBOX", "unseen": 3, "total": 12},
        {"name": "Sent", "unseen": 0, "total": 8},
        {"name": "Drafts", "unseen": 0, "total": 2},
        {"name": "Trash", "unseen": 0, "total": 5},
        {"name": "Junk", "unseen": 0, "total": 1},
    ],
    "pro": [
        {"name": "INBOX", "unseen": 5, "total": 20},
        {"name": "Sent", "unseen": 0, "total": 15},
        {"name": "Drafts", "unseen": 0, "total": 1},
        {"name": "Archive", "unseen": 0, "total": 30},
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
        "snippet": snippet,
        "message_id": f"<demo-{uid}@sombre.mail>",
        "to": "moi@moi.fr",
        "cc": "",
        "text": snippet + "\n\nCordialement,\n" + frm,
        "html": html or f"<p>{snippet}</p><p>Cordialement,<br><b>{frm}</b></p>",
        "attachments": [],
    }

def _demo_messages(account, folder):
    base = [
        ("Alice Martin <alice.martin@gmail.com>", "Réunion projet Sombre Mail", "Bonjour, est-ce que la réunion de demain est confirmée ? Merci !", False, True, False),
        ("GitHub <noreply@github.com>", "[FB/mail-client] PR #42 merged", "Your pull request has been merged into main. View changes on GitHub.", False, False, False),
        ("Le Monde <newsletter@lemonde.fr>", "Votre briefing du jour", "Les principaux titres de l'actualité : politique, économie, culture et sport.", False, False, False),
        ("Bob Leroy <bob.leroy@entreprise.com>", "Re: Devis site web", "Salut, ci-joint le devis modifié comme convenu. Dis-moi ce que tu en penses.", True, False, True),
        ("Stripe <receipts@stripe.com>", "Paiement reçu - 49,00€", "Vous avez reçu un paiement de 49,00€ de la part de Jean Dupont.", True, False, False),
        ("Claire Dubois <claire@design.fr>", "Maquettes v2 disponibles", "Les nouvelles maquettes sont prises en compte. J'ai ajouté les écrans mobile.", True, False, True),
        ("Spotify <no-reply@spotify.com>", "Votre récap de la semaine", "Vous avez écouté 14 heures de musique cette semaine. Découvrez vos top artistes.", True, False, False),
        ("David Chen <d.chen@startup.io>", "Partenariat ?", "Bonjour, je suis David de Startup.io. Serait-il possible d'organiser un call la semaine prochaine ?", True, False, False),
        ("Apple <no_reply@apple.com>", "Votre facture Apple", "Merci pour votre achat. Votre commande sera bientôt livrée.", True, False, False),
        ("Émilie Roux <emilie.roux@protonmail.com>", "Photos vacances", "Coucou ! Tu trouveras les photos en pièce jointe. C'était génial !", True, True, True),
        ("LinkedIn <invitations@linkedin.com>", "Vous avez 3 nouvelles invitations", "Jean Petit, Marie Lefevre et Lucas Moreau veulent rejoindre votre réseau.", True, False, False),
        ("Forum <admin@forum-dev.fr>", "Bienvenue sur le forum", "Votre compte a été créé avec succès. Activez-le pour commencer à poster.", True, False, False),
    ]
    msgs = []
    for i, (frm, subj, snippet, seen, flagged, has_att) in enumerate(base):
        full = _demo_msg(i + 1, account, folder, seen, flagged, has_att, subj, frm, snippet, days_ago=i)
        full["category"] = _categorize(full["from_addr"], full["from_name"], full["subject"])
        full["thread_id"] = str(full["uid"])
        msgs.append(full)
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
    if _is_demo():
        return DEMO_ACCOUNTS
    cfg = active_config()
    out = []
    for a in cfg.get("accounts", []):
        out.append({
            "id": a["id"],
            "name": a.get("name", a["id"]),
            "email": a["imap"]["user"],
        })
    return out


@app.get("/api/accounts/all")
def accounts_all():
    cfg = load_config(configured_only=False)
    out = []
    for a in cfg.get("accounts", []):
        connected = _account_is_configured(a)
        out.append({
            "id": a["id"],
            "name": a.get("name", a["id"]),
            "email": a["imap"]["user"],
            "connected": connected,
        })
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


SECRETS_PATH = BASE_DIR / "secrets" / "mail.env"


@app.post("/api/accounts")
def create_account(body: CreateAccountRequest):
    aid = re.sub(r"[^a-z0-9]+", "", body.name.lower().replace(" ", "")) or re.sub(r"[^a-z0-9]+", "", body.email.split("@")[0].lower())
    cfg = load_config(configured_only=False)
    if any(a["id"] == aid for a in cfg.get("accounts", [])):
        raise HTTPException(status_code=409, detail=f"Le compte '{aid}' existe déjà")

    pw_var_imap = f"{aid.upper()}_IMAP_PASSWORD"
    pw_var_smtp = f"{aid.upper()}_SMTP_PASSWORD"

    SECRETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    env_lines = []
    if SECRETS_PATH.exists():
        env_lines = [l for l in SECRETS_PATH.read_text(encoding="utf-8").splitlines()
                     if not l.startswith(f"{pw_var_imap}=") and not l.startswith(f"{pw_var_smtp}=")]
    env_lines.append(f"{pw_var_imap}={body.imap_password}")
    env_lines.append(f"{pw_var_smtp}={body.smtp_password}")
    SECRETS_PATH.write_text("\n".join(env_lines) + "\n", encoding="utf-8")

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

    _reload_env(SECRETS_PATH)
    threading.Thread(
        target=idle_worker, args=(new_account,), daemon=True, name=f"idle-{aid}"
    ).start()

    return {"ok": True, "id": aid, "connected": True}


def _reload_env(env_path):
    if env_path.exists():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                os.environ[k.strip()] = v.strip()


@app.get("/api/accounts/{account_id}/folders")
def folders(account_id: str):
    if _is_demo():
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
    if _is_demo():
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
    if _is_demo():
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


@app.patch("/api/messages/{account}/{uid}")
def update_flags(account: str, uid: str, body: FlagUpdate, folder: str = Query("INBOX")):
    if _is_demo():
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
    if _is_demo():
        return {"ok": True}
    acc = get_account(account)
    with open_mailbox(acc) as mailbox:
        mailbox.folder.set(folder)
        mailbox.delete(uid)
    cache_invalidate(account, folder, uid)
    return {"ok": True}


@app.post("/api/send")
def send_message(body: SendRequest):
    if _is_demo():
        return {"ok": True}
    acc = get_account(body.account)
    msg = EmailMessage()
    msg["From"] = acc["imap"]["user"]
    msg["To"] = body.to
    if body.cc:
        msg["Cc"] = body.cc
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

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

from imap_tools import MailBox, AND, MailMessageFlags
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
        return load_config()
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
        for acc in _safe_load_config().get("accounts", []):
            threading.Thread(
                target=idle_worker, args=(acc,), daemon=True, name=f"idle-{acc['id']}"
            ).start()
    yield


app = FastAPI(title="Sombre Mail", lifespan=lifespan)


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


def load_config():
    if not CONFIG_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="config.json introuvable. Copiez config.example.json -> config.json et renseignez vos comptes.",
        )
    data = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return data


def get_account(account_id: str):
    cfg = load_config()
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
    box = MailBox(host, port)
    if starttls:
        conn = box.login(imap["user"], imap["password"], starttls=True)
    else:
        conn = box.login(imap["user"], imap["password"], ssl=ssl)
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
        s.send_message(msg)
    finally:
        s.quit()


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


# ---------- Demo mode ----------
def _is_demo():
    cfg = _safe_load_config()
    for a in cfg.get("accounts", []):
        pw = a.get("imap", {}).get("password", "")
        if "MOT_DE_PASSE" in pw or pw == "":
            return True
    return False


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
        msgs.append(full)
    return msgs


# ---------- Routes ----------

@app.get("/")
def index():
    return FileResponse(BASE_DIR / "index.html")


@app.get("/api/accounts")
def accounts():
    if _is_demo():
        return DEMO_ACCOUNTS
    cfg = load_config()
    out = []
    for a in cfg.get("accounts", []):
        out.append({
            "id": a["id"],
            "name": a.get("name", a["id"]),
            "email": a["imap"]["user"],
        })
    return out


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
                "message_id": msg.headers.get("message-id", ""),
            })
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
            "to": msg.headers.get("to", ""),
            "cc": msg.headers.get("cc", ""),
            "date": msg.date.isoformat() if msg.date else None,
            "seen": "\\Seen" in [str(f) for f in msg.flags],
            "flagged": "\\Flagged" in [str(f) for f in msg.flags],
            "text": msg.text or "",
            "html": msg.html or "",
            "message_id": msg.headers.get("message-id", ""),
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

    send_via_smtp(acc, msg)
    # Stocker dans Sent si possible
    try:
        with open_mailbox(acc) as mailbox:
            for sent_name in ("Sent", "INBOX.Sent", "Sent Items", "Boîte d'envoi"):
                if mailbox.folder.exists(sent_name):
                    mailbox.append(sent_name, str(msg), flag_set=[MailMessageFlags.SEEN])
                    break
    except Exception:
        pass
    return {"ok": True}


# ---------- Helpers ----------

def _find_message(mailbox, uid):
    for msg in mailbox.fetch(AND(uid=str(uid)), limit=1, mark_seen=False, bulk=True):
        return msg
    return None


def _strip_html(html: str) -> str:
    text = re.sub(r"(?is)<(script|style).*?>.*?</\1>", "", html or "")
    text = re.sub(r"(?s)<[^>]+>", " ", text)
    return " ".join(text.split())


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

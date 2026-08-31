import json
import os
import socket
import subprocess
import tarfile
import tempfile
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

REPO = Path(__file__).resolve().parent.parent
DEST = Path.home() / "gmailpk-tester"
PORT = 9900
BASE_PORT = 9920

VERSION_SPECS = (
    {
        "id": "lab-v2-atelier-current",
        "runtime_id": "workspace",
        "label": "Lab V2 — Atelier (actuel)",
        "description": "Version de travail servie depuis src/lab.",
        "path": "/lab/",
    },
    {
        "id": "lab-v2-atelier-2026-08-07",
        "runtime_id": "workspace",
        "label": "Lab V2 — Atelier (9920, 2026.08.07)",
        "description": "Snapshot immuable récupéré du paquet PKMail.",
        "path": "/lab-atelier-2026-08-07/",
    },
    {
        "id": "classic-v1-0-4",
        "runtime_id": "classic-v1-0-4",
        "label": "Interface classique V1.0.4",
        "description": "Archive historique conservée telle quelle.",
        "path": "/",
        "source": "a64e77657ef2833600f2b8eb0a70f6c066fc8000",
    },
    {
        "id": "classic-2026-08-01",
        "runtime_id": "classic-2026-08-01",
        "label": "Interface classique (2026.08.01)",
        "description": "Archive historique conservée telle quelle.",
        "path": "/",
        "source": "7e293c6034ce286bea03eb8cf5d05af6f15fd979",
    },
)
VERSION_SPECS_BY_ID = {spec["id"]: spec for spec in VERSION_SPECS}
procs = {}
lock = threading.Lock()

PAGE = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SimpleMail — Tester les versions</title>
<style>
:root{--ink:#17181C;--muted:#71757C;--faint:#A6A9AE;--hair:#E9E9E4;--accent:#C64A12;
--mono:ui-monospace,"SF Mono",Menlo,monospace}
*{margin:0;box-sizing:border-box}
body{font-family:system-ui,-apple-system,sans-serif;background:#fff;color:var(--ink);
min-height:100vh;display:flex;justify-content:center;padding:60px 20px}
main{width:min(620px,100%)}
h1{font:600 20px/1.2 var(--mono);letter-spacing:-.01em;margin-bottom:6px}
p.sub{font:400 12px/1.5 var(--mono);color:var(--muted);margin-bottom:34px}
.card{border:1px solid var(--hair);border-radius:12px;padding:18px 20px;margin-bottom:12px;
display:flex;align-items:center;gap:14px}
.name{font-weight:600;font-size:15px}
.branch{font:400 11px/1.4 var(--mono);color:var(--muted);margin-top:3px}
.meta{margin-left:auto;text-align:right}
.url{font:500 11px/1.4 var(--mono);color:var(--accent);text-decoration:none}
.off{font:400 11px/1.4 var(--mono);color:var(--faint)}
button{font:500 12px/1 var(--mono);border-radius:8px;padding:9px 16px;cursor:pointer}
.go{background:var(--ink);border:1px solid var(--ink);color:#fff}
.stop{background:#fff;border:1px solid var(--hair);color:var(--muted)}
button:hover{border-color:var(--faint)}
details{width:100%;margin-top:10px}
summary{font:400 11px var(--mono);color:var(--faint);cursor:pointer}
pre{margin-top:8px;padding:12px;background:#FAFAF8;border:1px solid var(--hair);
border-radius:8px;font:400 11px/1.6 var(--mono);color:var(--muted);overflow:auto;white-space:pre-wrap}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
</style></head><body><main>
<h1>CHOISIR UNE VERSION</h1>
<p class="sub">Clique sur Lancer. La version choisie s'ouvre dans un nouvel onglet. Stop l'arrête.</p>
<div id="list"></div>
</main>
<script>
const list=document.getElementById('list');
function el(h){const d=document.createElement('div');d.innerHTML=h.trim();return d.firstChild}
async function refresh(){
  const s=await (await fetch('/api/status')).json();
  list.innerHTML='';
  for(const e of s.entries){
    const c=el(`<div class="card">
      <div><div class="name">${e.label}</div><div class="branch">${e.description}</div></div>
      <div class="meta">${e.running?`<a class="url" href="${e.url}" target="_blank">Ouvrir</a>`:`<span class="off">Non lancée</span>`}</div>
      <button class="${e.running?'stop':'go'}" data-name="${e.name}">${e.running?'Stop':'Lancer'}</button>
    </div>`);
    const d=el(`<details><summary>journal</summary><pre>…</pre></details>`);
    c.appendChild(d);
    d.querySelector('summary').onclick=async ev=>{
      ev.preventDefault();
      d.querySelector('pre').textContent=await (await fetch('/api/log?name='+encodeURIComponent(e.name))).text();
    };
    c.querySelector('button').onclick=async ev=>{
      ev.target.disabled=true;
       await fetch('/api/'+(e.running?'stop':'start')+'?name='+encodeURIComponent(e.name),{method:'POST'});
      setTimeout(refresh,400);
    };
    list.appendChild(c);
  }
}
refresh();setInterval(refresh,2500);
</script></body></html>"""


def free_port():
    for p in range(BASE_PORT, BASE_PORT + 50):
        with socket.socket() as s:
            try:
                s.bind(("127.0.0.1", p))
                return p
            except OSError:
                pass
    raise RuntimeError("aucun port libre")


def log_path(runtime_id):
    DEST.mkdir(exist_ok=True)
    return DEST / f"{runtime_id}.log"

def extract(source, dest):
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".tar", delete=False) as t:
        subprocess.run(
            ["git", "archive", source, "src/desktop", "-o", t.name],
            cwd=REPO, check=True, capture_output=True,
        )
        with tarfile.open(t.name) as tf:
            try:
                tf.extractall(dest, filter="data")
            except TypeError:
                tf.extractall(dest)
    os.unlink(t.name)


def start(version_id):
    spec = VERSION_SPECS_BY_ID[version_id]
    runtime_id = spec["runtime_id"]
    with lock:
        entry = procs.get(runtime_id)
        if entry and entry[0].poll() is None:
            return
        if "source" in spec:
            dest = DEST / runtime_id
            extract(spec["source"], dest)
            app_dir = dest / "src" / "desktop"
            cfg = app_dir / "config.json"
            if not cfg.exists():
                cfg.write_text((app_dir / "config.example.json").read_text(encoding="utf-8"), encoding="utf-8")
        else:
            app_dir = REPO / "src" / "desktop"
        port = free_port()
        cmd = ["python3", "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)]
        env = dict(os.environ, SIMPLEMAIL_AUTH="0")
        procs[runtime_id] = (
            subprocess.Popen(cmd, cwd=app_dir, env=env, start_new_session=True,
                             stdout=open(log_path(runtime_id), "w"), stderr=subprocess.STDOUT),
            port,
        )


def stop(version_id):
    spec = VERSION_SPECS_BY_ID[version_id]
    with lock:
        entry = procs.pop(spec["runtime_id"], None)
    if entry:
        entry[0].terminate()
        try:
            entry[0].wait(timeout=5)
        except subprocess.TimeoutExpired:
            entry[0].kill()


def status():
    entries = []
    for spec in VERSION_SPECS:
        entry = procs.get(spec["runtime_id"])
        running = bool(entry and entry[0].poll() is None)
        entries.append({
            "name": spec["id"],
            "label": spec["label"],
            "description": spec["description"],
            "running": running,
            "url": f"http://127.0.0.1:{entry[1]}{spec['path']}" if running else "",
        })
    return {"entries": entries}


class Handler(BaseHTTPRequestHandler):
    def reply(self, body, ctype="application/json", code=200):
        data = body if isinstance(body, bytes) else body.encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        u = urlparse(self.path)
        if u.path == "/":
            self.reply(PAGE, "text/html; charset=utf-8")
        elif u.path == "/api/status":
            self.reply(json.dumps(status()))
        elif u.path == "/api/log":
            version_id = parse_qs(u.query).get("name", [""])[0]
            spec = VERSION_SPECS_BY_ID.get(version_id)
            if not spec:
                self.reply(json.dumps({"error": "version inconnue"}), code=404)
                return
            p = log_path(spec["runtime_id"])
            self.reply(p.read_text(errors="replace")[-4000:] if p.exists() else "(vide)", "text/plain; charset=utf-8")
        else:
            self.reply("404", "text/plain", 404)

    def do_POST(self):
        u = urlparse(self.path)
        version_id = parse_qs(u.query).get("name", [""])[0]
        if version_id not in VERSION_SPECS_BY_ID:
            self.reply(json.dumps({"error": "version inconnue"}), code=400)
        elif u.path == "/api/start":
            start(version_id)
            self.reply(json.dumps(status()))
        elif u.path == "/api/stop":
            stop(version_id)
            self.reply(json.dumps(status()))
        else:
            self.reply("404", "text/plain", 404)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    if os.environ.get("TESTER_OPEN"):
        threading.Timer(0.4, lambda: webbrowser.open(f"http://127.0.0.1:{PORT}/")).start()
    print(f"Tester SimpleMail : http://127.0.0.1:{PORT}/")
    srv.serve_forever()

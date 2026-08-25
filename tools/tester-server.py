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


def branches():
    out = subprocess.run(
        ["git", "for-each-ref", "--format=%(refname:short)", "refs/heads/archive/"],
        cwd=REPO, capture_output=True, text=True,
    ).stdout
    return sorted(l.strip() for l in out.splitlines() if l.strip())


def log_path(name):
    DEST.mkdir(exist_ok=True)
    return DEST / (name.replace("/", "_") + ".log")


def extract(branch, dest):
    dest.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".tar", delete=False) as t:
        subprocess.run(
            ["git", "archive", branch, "src/desktop", "-o", t.name],
            cwd=REPO, check=True, capture_output=True,
        )
        with tarfile.open(t.name) as tf:
            try:
                tf.extractall(dest, filter="data")
            except TypeError:
                tf.extractall(dest)
    os.unlink(t.name)


def start(name):
    with lock:
        if name in procs and procs[name][0].poll() is None:
            return
        if name == "lab":
            app_dir = REPO / "src" / "desktop"
            port = free_port()
            cmd = ["python3", "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)]
            cwd = app_dir
        else:
            dest = DEST / name.split("/")[-1]
            extract(name, dest)
            app_dir = dest / "src" / "desktop"
            cfg = app_dir / "config.json"
            if not cfg.exists():
                cfg.write_text((app_dir / "config.example.json").read_text(encoding="utf-8"), encoding="utf-8")
            port = free_port()
            cmd = ["python3", "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(port)]
            cwd = app_dir
        env = dict(os.environ, SIMPLEMAIL_AUTH="0")
        procs[name] = (
            subprocess.Popen(cmd, cwd=cwd, env=env, start_new_session=True,
                             stdout=open(log_path(name), "w"), stderr=subprocess.STDOUT),
            port,
        )


def stop(name):
    with lock:
        entry = procs.pop(name, None)
    if entry:
        entry[0].terminate()
        try:
            entry[0].wait(timeout=5)
        except subprocess.TimeoutExpired:
            entry[0].kill()


def status():
    entries = [{"name": "lab", "label": "Nouvelle interface V2", "description": "3 thèmes, catégories Gmail, post-its et PWA", "path": "/lab/"}]
    for b in branches():
        entries.append({"name": b, "label": "Ancienne interface classique", "description": "Version 1.0.4 conservée telle quelle"})
    for e in entries:
        p = procs.get(e["name"])
        running = bool(p and p[0].poll() is None)
        e["running"] = running
        e["url"] = f"http://127.0.0.1:{p[1]}{e.get('path', '/')}" if p else ""
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
            name = parse_qs(u.query).get("name", [""])[0]
            p = log_path(name)
            self.reply(p.read_text(errors="replace")[-4000:] if p.exists() else "(vide)", "text/plain; charset=utf-8")
        else:
            self.reply("404", "text/plain", 404)

    def do_POST(self):
        u = urlparse(self.path)
        name = parse_qs(u.query).get("name", [""])[0]
        if u.path == "/api/start" and name:
            start(name)
            self.reply(json.dumps(status()))
        elif u.path == "/api/stop" and name:
            stop(name)
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

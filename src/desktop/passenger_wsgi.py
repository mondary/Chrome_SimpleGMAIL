"""Point d'entrée WSGI pour o2switch (cPanel « Setup Python App »).

Setup Python App (CloudLinux Passenger / LiteSpeed LSAPI) attend un objet
`application` callable au format WSGI. FastAPI est ASGI — on utilise
`a2wsgi.ASGIMiddleware` pour l'adapter.

WSGI n'émet pas les événements lifespan de FastAPI, donc on déclenche
manuellement le startup (initialisation SQLite + threads de fond). Le tout
est wrappé en try/except : si le startup échoue, l'app continue de servir
les requêtes (sans les optimisations de cache/IDLE).
"""
import os
import sys
import asyncio

APP_DIR = os.path.dirname(os.path.abspath(__file__))
if APP_DIR not in sys.path:
    sys.path.insert(0, APP_DIR)

# Le data dir doit être inscriptible. Sur o2switch, on reste sur le home
# utilisateur (la branche Linux de _user_data_dir renvoie ~/.local/share/).
os.chdir(APP_DIR)

from main import app, lifespan  # noqa: E402

# Déclenche le lifespan startup manuellement (WSGI ne le fait pas).
try:
    _loop = asyncio.new_event_loop()
    asyncio.set_event_loop(_loop)
    _cm = lifespan(app)
    _loop.run_until_complete(_cm.__aenter__())
    sys.stderr.write("[startup] SimpleMail lifespan OK\n")
except Exception as exc:
    sys.stderr.write(f"[startup] lifespan ignoré (non-fatal) : {exc}\n")

from a2wsgi import ASGIMiddleware  # noqa: E402
application = ASGIMiddleware(app)

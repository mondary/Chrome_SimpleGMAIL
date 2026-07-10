"""SimpleMail desktop launcher.

Starts the FastAPI backend (main.app) on a local port, then opens a native
OS window (pywebview / WKWebView) showing the web UI. Designed to be frozen
with PyInstaller into a .app / .exe / Linux binary.
"""
import os
import re
import sys
import time
import socket
import threading


def resource_dir():
    """Folder containing bundled data files (frozen or dev)."""
    if getattr(sys, "_MEIPASS", None):       # PyInstaller bundle (onefile + onedir/.app)
        return sys._MEIPASS
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def load_env_file(path):
    """Source a KEY=value file into os.environ (mirrors start.sh)."""
    if not os.path.isfile(path):
        return
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            m = re.match(r"^([A-Za-z_][A-Za-z0-9_]*)=(.*)$", line)
            if not m:
                continue
            key, val = m.group(1), m.group(2).rstrip("\r")
            os.environ.setdefault(key, val)


def app_version(base):
    try:
        with open(os.path.join(base, "VERSION"), "r", encoding="utf-8") as fh:
            return fh.read().strip() or "dev"
    except OSError:
        return "dev"


def find_free_port(start=8000, end=8030):
    for port in range(start, end + 1):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", port))
                return port
        except OSError:
            continue
    return start


def wait_for_port(host, port, timeout=25.0):
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.2)
    return False


def main():
    base = resource_dir()
    os.chdir(base)  # config.json / db / relative paths resolve from here
    if base not in sys.path:
        sys.path.insert(0, base)
    load_env_file(os.path.join(base, "secrets", "mail.env"))

    import uvicorn
    from main import app

    port = find_free_port()
    server = uvicorn.Server(uvicorn.Config(
        app, host="127.0.0.1", port=port, log_level="warning", access_log=False,
    ))
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    url = f"http://127.0.0.1:{port}/"
    if not wait_for_port("127.0.0.1", port):
        # Backend didn't come up — fall back to the default browser.
        import webbrowser
        webbrowser.open(url)
        return

    import webview
    webview.create_window(
        f"SimpleMail {app_version(base)}", url, width=1280, height=840, min_size=(960, 620),
    )
    webview.start()
    server.should_exit = True


if __name__ == "__main__":
    main()

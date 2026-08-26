from html.parser import HTMLParser
from pathlib import Path

HTML = Path(__file__).with_name("index.html").read_text(encoding="utf-8")
VOID = {"meta", "link", "br", "hr", "img", "input", "source"}


class Balancer(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack, self.errors = [], []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
        else:
            self.errors.append(f"fermeture inattendue: {tag}")


def main():
    for marker in ("Focus OS", "Label Canvas", "Paper Reader", "data-theme"):
        assert marker in HTML, f"marqueur absent: {marker}"
    assert HTML.count("from:{name:") >= 8, "mocks de secours absents"
    assert HTML.count("s2/favicons?domain=") >= 1, "favicons expéditeur absents"
    assert 'allow-same-origin allow-popups' in HTML, "rendu html sandbox absent"
    assert "/api/messages" in HTML, "couche gmail absente"
    assert "no_cache=true" in HTML, "actualisation Gmail forcée absente"
    assert "snapshot=true" in HTML, "instantané de démarrage absent"
    assert "setInterval(()=>{if(!document.hidden)refreshMail()},60000)" in HTML, "actualisation toutes les 60 secondes absente"
    assert "data-reload" in HTML and "Actualiser" in HTML, "bouton d'actualisation absent"
    assert "JetBrainsMonoNerdFont-Regular.ttf" in HTML, "nerd font locale absente"
    assert "ov-set" in HTML, "réglages absents"
    for marker in ("manifest.json", "serviceWorker", "CATEGORIES", "memoPostits", "shortcutPreset",
                   "three.min.js", "world-canvas", "cycleCategory"):
        assert marker in HTML, f"fonction V2 absente: {marker}"
    for uid in ("#ov-pal", "#ov-reply", "#ov-help", "#ov-read", "#ov-set", "#toast",
                "cv-cols", "p-strip", "f-mount", "f-list", "p-list", "hud-live"):
        assert uid in HTML, f"element absent: {uid}"
    p = Balancer()
    p.feed(HTML)
    assert not p.stack, f"balises non fermees: {p.stack}"
    assert not p.errors, str(p.errors)
    print("lab smoke ok")


if __name__ == "__main__":
    main()

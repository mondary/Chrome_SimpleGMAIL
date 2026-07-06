"""
Intégration IA locale pour SimpleMail.

Philosophie (inspirée de TypeWhisper) :
  - Inférence IN-PROCESS, pas de daemon externe. On link le runtime (MLX) directement
    dans le process Python — indépendant d'Ollama. Si l'utilisateur bidouille Ollama,
    l'IA de SimpleMail continue de fonctionner.
  - Dépendance OPTIONNELLE : l'app démarre normalement sans mlx-lm. Les features IA
    sont désactivées proprement.
  - Chargement PALESOU : le modèle n'est chargé qu'au premier appel IA, pas au boot.
    Évite +3-5s de démarrage et ~2 Go de RAM si l'IA n'est pas utilisée.
  - Thread-safety : uvicorn tourne avec workers=1, mais FastAPI exécute les handlers
    `def` (sync) dans un threadpool. Un ver protège le chargement du modèle.

Backends supportés (par ordre de priorité quand provider="auto") :
  1. mlx-lm — natif Apple Silicon, in-process. Recommandé.
  2. ollama  — si un serveur Ollama tourne localement (http://localhost:11434).
     Bonus, pas requis. Indépendance conservée côté mlx.
"""

import os
import platform
import threading
import json
import urllib.request
import urllib.error

# ---- Détection optionnelle de mlx-lm ----
_HAS_MLX = False
try:
    import mlx_lm  # noqa: F401
    _HAS_MLX = True
except Exception:
    _HAS_MLX = False

_IS_APPLE_SILICON = platform.machine() == "arm64" and platform.system() == "Darwin"

DEFAULT_MODEL = "mlx-community/Qwen2.5-3B-Instruct-4bit"
DEFAULT_MODEL_LITE = "mlx-community/Qwen2.5-1.5B-Instruct-4bit"


class AIBackendError(Exception):
    """Aucun backend d'inférence disponible."""


class AIManager:
    """
    Singleton gérant le modèle d'inférence local.

    Reproduit le pattern ModelManagerService de TypeWhisper : un gestionnaire
    central qui délègue à un moteur, avec un cycle de vie découplé du reste
    de l'app (chargement/déchargement paresseux).
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._model = None
        self._tokenizer = None
        self._loaded_model_id = None
        self._provider = None  # "mlx" | "ollama" | None

    # ---------- Disponibilité / état ----------

    @staticmethod
    def mlx_supported() -> bool:
        """mlx-lm installé ET on est sur Apple Silicon."""
        return _HAS_MLX and _IS_APPLE_SILICON

    @staticmethod
    def ollama_available(timeout: float = 0.6) -> bool:
        """Détecte un serveur Ollama local (non-bloquant, rapide)."""
        try:
            req = urllib.request.Request(
                "http://localhost:11434/api/tags", method="GET"
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return resp.status == 200
        except Exception:
            return False

    def is_available(self) -> bool:
        """Au moins un backend utilisable."""
        return self.mlx_supported() or self.ollama_available()

    def get_status(self) -> dict:
        loaded = self._model is not None or self._provider == "ollama"
        return {
            "available": self.is_available(),
            "mlx_supported": self.mlx_supported(),
            "ollama_available": self.ollama_available(),
            "provider": self._provider,
            "model": self._loaded_model_id,
            "loaded": loaded,
            "default_model": DEFAULT_MODEL,
            "lite_model": DEFAULT_MODEL_LITE,
        }

    # ---------- Chargement paresseux ----------

    def _ensure_loaded(self, model_id: str, provider: str = "auto"):
        """Charge le modèle si pas déjà fait. Thread-safe."""
        if self._loaded_model_id == model_id and self._model is not None:
            return
        with self._lock:
            # Double-check après acquisition du ver.
            if self._loaded_model_id == model_id and self._model is not None:
                return
            self._load_locked(model_id, provider)

    def _load_locked(self, model_id: str, provider: str):
        if provider in ("auto", "mlx") and self.mlx_supported():
            import mlx_lm
            print(f"[AI] Chargement du modèle MLX : {model_id}")
            self._model, self._tokenizer = mlx_lm.load(model_id)
            self._loaded_model_id = model_id
            self._provider = "mlx"
            print(f"[AI] Modèle chargé ({self._provider}).")
            return
        if provider in ("auto", "ollama") and self.ollama_available():
            # Ollama : pas de chargement in-process, on laisse le serveur gérer.
            ollama_model = os.environ.get("SIMPLEMAIL_OLLAMA_MODEL", "qwen2.5:3b")
            self._loaded_model_id = ollama_model
            self._provider = "ollama"
            print(f"[AI] Backend Ollama actif, modèle : {ollama_model}")
            return
        raise AIBackendError(
            "Aucun backend IA disponible. Installez mlx-lm "
            "(pip install mlx-lm) sur Apple Silicon, ou lancez Ollama."
        )

    def unload(self):
        with self._lock:
            self._model = None
            self._tokenizer = None
            self._loaded_model_id = None
            self._provider = None
            import gc
            gc.collect()

    # ---------- Génération ----------

    def generate(self, prompt: str, system: str = "", max_tokens: int = 300,
                 temperature: float = 0.7, model_id: str = None,
                 provider: str = "auto") -> str:
        """
        Génère du texte. `prompt` est le message utilisateur ;
        `system` le rôle système (instructions de style/tâche).
        """
        model_id = model_id or DEFAULT_MODEL
        self._ensure_loaded(model_id, provider)

        if self._provider == "mlx":
            return self._gen_mlx(prompt, system, max_tokens, temperature)
        if self._provider == "ollama":
            return self._gen_ollama(prompt, system, max_tokens, temperature)
        raise AIBackendError("Backend IA dans un état incohérent.")

    def _gen_mlx(self, prompt: str, system: str, max_tokens: int,
                 temperature: float) -> str:
        import mlx_lm
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        # mlx-lm >= 0.20 expose stream_generate / generate avec chat.
        # On essaie l'API chat (la plus stable récemment).
        try:
            response = mlx_lm.generate(
                self._model,
                self._tokenizer,
                prompt=mlx_lm.utils.apply_chat_template(
                    self._tokenizer, messages
                ),
                max_tokens=max_tokens,
                temp=temperature,
                verbose=False,
            )
            return self._extract_text(response)
        except (AttributeError, TypeError):
            # Fallback : API generate(model, tokenizer, prompt=str, ...)
            full_prompt = self._build_raw_prompt(messages)
            response = mlx_lm.generate(
                self._model,
                self._tokenizer,
                prompt=full_prompt,
                max_tokens=max_tokens,
                temp=temperature,
                verbose=False,
            )
            return self._extract_text(response)

    def _gen_ollama(self, prompt: str, system: str, max_tokens: int,
                    temperature: float) -> str:
        model = os.environ.get("SIMPLEMAIL_OLLAMA_MODEL", "qwen2.5:3b")
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": max_tokens,
                "temperature": temperature,
            },
        }
        if system:
            payload["system"] = system
        data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "http://localhost:11434/api/generate",
            data=data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                body = resp.read().decode("utf-8")
            # La réponse Ollama (non-stream) est un JSON unique.
            obj = json.loads(body)
            return obj.get("response", "").strip()
        except urllib.error.URLError as e:
            raise AIBackendError(f"Ollama injoignable : {e}")

    # ---------- Helpers ----------

    @staticmethod
    def _extract_text(response) -> str:
        """mlx-lm renvoie un objet réponse ou un générateur selon la version."""
        # Objet avec attribut .text (versions récentes)
        text = getattr(response, "text", None)
        if text is not None:
            return text.strip()
        # Générateur : on prend le dernier chunk.
        last = ""
        try:
            for chunk in response:
                t = getattr(chunk, "text", None) or str(chunk)
                if t:
                    last = t
        except TypeError:
            pass
        return last.strip()

    @staticmethod
    def _build_raw_prompt(messages) -> str:
        """Prompt brut de secours si apply_chat_template échoue."""
        parts = []
        for m in messages:
            role = m["role"]
            content = m["content"]
            parts.append(f"[{role}]\n{content}")
        parts.append("[assistant]")
        return "\n\n".join(parts)


# ---------- Singleton global ----------

ai_manager = AIManager()


# ============================================================================
# Prompts en français — centralisés, facilement ajustables.
# Chaque fonction retourne (system, user_prompt).
# ============================================================================

_SYSTEM_BASE = (
    "Tu es un assistant intégré à un client mail en français. "
    "Tu es concis, précis et naturel. Tu réponds toujours en français "
    "sauf si le message original est dans une autre langue."
)


def summarize_inputs(subject: str, sender: str, body: str) -> tuple:
    """Pour le TL;DR du lecteur."""
    system = (
        _SYSTEM_BASE
        + " Tu résumes les emails en 2 à 4 phrases courtes, max ~60 mots. "
        "Tu vas droit au fait : décisions demandées, dates/échéances, points clés. "
        "Pas d'introduction, pas de formule de politesse."
    )
    user = (
        f"Sujet : {subject or '(sans objet)'}\n"
        f"Expéditeur : {sender or 'inconnu'}\n\n"
        f"Message :\n{_truncate(body, 4000)}\n\n"
        "Résume ce message en français, en 2 à 4 phrases."
    )
    return system, user


def reply_inputs(subject: str, sender: str, body: str,
                 thread_context: str, tone: str) -> tuple:
    """Pour la réponse suggérée. tone ∈ court|amical|formel|détaillé."""
    tone_guides = {
        "court": "Très court (2-4 phrases), direct, professionnel.",
        "amical": "Ton amical et chaleureux, mais reste professionnel.",
        "formel": "Ton formel et soutenu, vouvoiement, formules de politesse.",
        "détaillé": "Réponse complète et détaillée, structure claire.",
    }
    guide = tone_guides.get(tone, tone_guides["court"])
    system = (
        _SYSTEM_BASE
        + f" Tu rédiges une réponse d'email à la place de l'utilisateur. "
        f"Style : {guide} "
        f"Ne mets PAS de ligne d'objet, uniquement le corps du message. "
        f"Ne mets PAS de signature. Commence directement par la formule d'appel."
    )
    context_block = ""
    if thread_context:
        context_block = (
            "\n\n--- Messages précédents de la conversation ---\n"
            f"{_truncate(thread_context, 2000)}\n"
            "--- Fin des messages précédents ---\n"
        )
    user = (
        f"Tu réponds à cet email :\n"
        f"Sujet : {subject or '(sans objet)'}\n"
        f"Expéditeur : {sender or 'inconnu'}\n\n"
        f"Message reçu :\n{_truncate(body, 3000)}\n"
        f"{context_block}\n"
        "Rédige uniquement le corps de la réponse."
    )
    return system, user


def rewrite_inputs(text: str, action: str) -> tuple:
    """Pour la correction/reformulation. action ∈ corriger|formel|amical|concis|reformuler."""
    action_guides = {
        "corriger": "Corrige les fautes d'orthographe, grammaire et ponctuation. Garde le sens et le style identiques.",
        "formel": "Reformule avec un ton plus formel et soutenu.",
        "amical": "Reformule avec un ton plus amical et détendu, reste professionnel.",
        "concis": "Rends le texte plus concis et direct, sans perdre l'information.",
        "reformuler": "Reformule le texte pour le rendre plus clair et fluide, en gardant le même sens.",
    }
    guide = action_guides.get(action, action_guides["corriger"])
    system = (
        _SYSTEM_BASE
        + f" {guide} "
        "Tu renvoies UNIQUEMENT le texte transformé, sans commentaire, "
        "sans explication, sans préfixe. Conserve les retours à la ligne logiques."
    )
    user = f"Texte à transformer :\n\n{_truncate(text, 4000)}"
    return system, user


def categorize_inputs(subject: str, sender: str, body: str) -> tuple:
    """Pour la catégorisation. Retour attendu : un mot parmi une liste fixe."""
    system = (
        "Tu es un classifieur d'emails. Tu réponds par UN SEUL mot parmi : "
        "primary, social, forums, updates, promotions, purchases, newsletter. "
        "Pas d'autre texte, pas de ponctuation."
    )
    user = (
        f"Sujet : {subject or '(sans objet)'}\n"
        f"Expéditeur : {sender or 'inconnu'}\n\n"
        f"Extrait du message :\n{_truncate(body, 1000)}\n\n"
        "Catégorie (un mot) :"
    )
    return system, user


VALID_CATEGORIES = {
    "primary", "social", "forums", "updates",
    "promotions", "purchases", "newsletter",
}


def parse_category(raw: str) -> str:
    """Extrait la catégorie de la sortie brute du modèle, avec fallback."""
    if not raw:
        return "primary"
    raw_lower = raw.lower().strip()
    # Le 1er mot qui correspond à une catégorie valide.
    for word in raw_lower.replace(",", " ").split():
        word = word.strip(".:;-")
        if word in VALID_CATEGORIES:
            return word
    return "primary"


def _truncate(text: str, max_chars: int) -> str:
    """Tronque proprement sans couper un mot au milieu."""
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_chars:
        return text
    cut = text[:max_chars].rsplit(" ", 1)[0]
    return cut + " […]"

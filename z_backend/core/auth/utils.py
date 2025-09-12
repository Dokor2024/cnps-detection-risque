
import hashlib
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.backends import TokenBackend  # ⬅️

User = get_user_model()

def generate_token_pair(user: User) -> tuple[str, str]:
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    refresh["email"] = user.email
    access = refresh.access_token
    access["role"] = user.role
    access["email"] = user.email
    return str(refresh), str(access)

def decode_exp(token_str: str) -> int:
    """
    Décode le JWT avec la même config que SimpleJWT (algo + clé).
    N'utilise PAS settings.SIGNING_KEY (n'existe pas dans Django).
    """
    algorithm = settings.SIMPLE_JWT.get("ALGORITHM", "HS256")
    signing_key = settings.SIMPLE_JWT.get("SIGNING_KEY", settings.SECRET_KEY)
    backend = TokenBackend(algorithm=algorithm, signing_key=signing_key, verifying_key=None)
    payload = backend.decode(token_str, verify=True)
    return int(payload["exp"])

def sha256(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()

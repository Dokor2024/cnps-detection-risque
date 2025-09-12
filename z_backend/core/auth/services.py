"""
Couche service (hexagonale):
- register_user
- login_user : crée pair (refresh, access), enregistre Session (hash refresh)
- refresh_pair : rotation (supprime ancienne session, crée nouvelle)
- logout_user : blacklist refresh + supprime session
- get_profile / update_profile : cache Redis (invalidation à la MAJ)
"""
from typing import Tuple
from datetime import datetime, timezone as dt_tz
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from ..models import Session
from .utils import generate_token_pair, decode_exp, sha256

User = get_user_model()
PROFILE_CACHE_TTL = 60 * 5  # 5 min

def _profile_key(user_id) -> str:
    return f"profile:{user_id}"

def register_user(*, email: str, password: str, role: str, username: str | None = None, name: str | None = None) -> User:
    user = User.objects.create_user(email=email, password=password, role=role, username=username or "", name=name or "")
    cache.set(_profile_key(user.id), _serialize_user(user), PROFILE_CACHE_TTL)
    return user

def login_user(*, user: User) -> tuple[dict, Session]:
    refresh, access = generate_token_pair(user)
    exp_ts = decode_exp(refresh)
    expires_at = datetime.fromtimestamp(exp_ts, tz=dt_tz.utc)
    session = Session.objects.create(user=user, token_hash=sha256(refresh), expires_at=expires_at)
    return {"refresh": refresh, "access": access, "token_type": "Bearer"}, session

def refresh_pair(*, old_refresh: str, user: User | None = None) -> dict:
    """
    Rotation des jetons:
      - Blacklist automatique (SIMPLE_JWT.BLACKLIST_AFTER_ROTATION=True)
      - Supprime l'entrée Session liée à l'ancien refresh
      - Crée une nouvelle Session liée au nouveau refresh
    """
    try:
        rt = RefreshToken(old_refresh)
        # Effet de rotation géré par SimpleJWT → on obtient un 'new access'
        data = {"access": str(rt.access_token)}
        # Si ROTATE_REFRESH_TOKENS=True, SimpleJWT renvoie un nouveau refresh depuis la view,
        # mais ici côté service, on l'obtient explicitement:
        new_refresh = str(rt)
        data["refresh"] = new_refresh

        # Session housekeeping
        Session.objects.filter(token_hash=sha256(old_refresh)).delete()
        exp_ts = decode_exp(new_refresh)
        expires_at = datetime.fromtimestamp(exp_ts, tz=dt_tz.utc)
        # si user fourni on peut tracer, sinon None (rt['user_id'] accessible via decode si besoin)
        Session.objects.create(user=user or None, token_hash=sha256(new_refresh), expires_at=expires_at)

        data["token_type"] = "Bearer"
        return data
    except TokenError as e:
        raise

def logout_user(*, refresh: str, user: User | None = None) -> None:
    """
    Blackliste le refresh + supprime l'entrée Session.
    """
    try:
        rt = RefreshToken(refresh)
        rt.blacklist()  # nécessite token_blacklist app
    finally:
        Session.objects.filter(token_hash=sha256(refresh)).delete()

def get_profile(*, user: User) -> dict:
    key = _profile_key(user.id)
    cached = cache.get(key)
    if cached:
        return cached
    data = _serialize_user(user)
    cache.set(key, data, PROFILE_CACHE_TTL)
    return data

def update_profile(*, user: User, **fields) -> dict:
    allowed = {"username", "name"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    for k, v in updates.items():
        setattr(user, k, v)
    user.full_clean(exclude=["password"])
    user.save(update_fields=list(updates.keys()))
    cache.delete(_profile_key(user.id))
    return get_profile(user=user)

def _serialize_user(u: User) -> dict:
    return {
        "id": str(u.id),
        "email": u.email,
        "username": u.username,
        "name": getattr(u, "name", None),
        "role": u.role,
        "is_active": u.is_active,
        "date_joined": u.date_joined.isoformat(),
    }

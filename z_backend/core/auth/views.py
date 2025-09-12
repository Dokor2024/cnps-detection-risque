from rest_framework import status, permissions, throttling
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiExample
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.exceptions import TokenError
from .serializers import RegisterSerializer, LoginSerializer, ProfileSerializer
from .services import register_user, login_user, refresh_pair, logout_user, get_profile, update_profile
from rest_framework_simplejwt.views import TokenVerifyView as BaseVerifyView

User = get_user_model()

def _get_bearer(request) -> str | None:
    auth = request.META.get("HTTP_AUTHORIZATION", "")
    if auth.lower().startswith("bearer "):
        return auth.split(" ", 1)[1].strip()
    return None

class ScopedThrottleMixin:
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope: str = "default"

# ---------- Register ----------
class RegisterView(ScopedThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_register"

    @extend_schema(
        request=RegisterSerializer,
        responses={201: ProfileSerializer},
        tags=["Auth"],
        summary="Inscription",
        examples=[OpenApiExample("Exemple", value={"email":"user@ex.com","password":"Passw0rd!","role":"Analyste","username":"user01","name":"Jane"})],
    )
    def post(self, request):
        ser = RegisterSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = register_user(**ser.validated_data)
        return Response(ProfileSerializer(user).data, status=status.HTTP_201_CREATED)

# ---------- Login (pair access+refresh) ----------
class LoginView(ScopedThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_login"

    @extend_schema(
        request=LoginSerializer,
        responses={
            200: OpenApiResponse(
                description="OK",
                examples=[
                    OpenApiExample(
                        "login-success",
                        value={
                            "token_type": "Bearer",
                            "access": "<jwt_access>",
                            "refresh": "<jwt_refresh>",
                            "user": {
                                "id": "uuid",
                                "email": "user@example.com",
                                "username": "user01",
                                "name": "Jane",
                                "role": "Analyste",
                                "is_active": True,
                                "date_joined": "2025-09-12T19:40:00Z"
                            }
                        }
                    )
                ]
            )
        },
        tags=["Auth"],
        summary="Connexion (retourne tokens + profil user)"
    )
    def post(self, request):
        ser = LoginSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        user = ser.validated_data["user"]

        tokens, _session = login_user(user=user)

        # Récup profil (via cache Redis si warm) et l’inclure dans la réponse
        profile = get_profile(user=user)
        return Response({**tokens, "user": profile}, status=status.HTTP_200_OK)

# ---------- Refresh (rotation + blacklist) ----------
class RefreshView(ScopedThrottleMixin, APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_refresh"

    @extend_schema(
        request={"type": "object", "properties": {"refresh": {"type": "string"}}, "required": ["refresh"]},
        responses={200: OpenApiResponse(description="OK", examples=[OpenApiExample("new-pair", value={"access":"<jwt>","refresh":"<jwt-rotated>","token_type":"Bearer"})])},
        tags=["Auth"],
        summary="Renouveler les jetons (rotation + blacklist)"
    )
    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": _("Paramètre 'refresh' manquant.")}, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = refresh_pair(old_refresh=refresh, user=None)
            return Response(data, status=status.HTTP_200_OK)
        except TokenError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

# ---------- Verify (valider un access token) ----------
class VerifyView(ScopedThrottleMixin, BaseVerifyView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_verify"
    # Hérite de l'implémentation SimpleJWT (vérifie signature/exp/nbf/etc.)
    # Swagger auto va documenter le schéma { "token": "<access>" }

# ---------- Logout (blacklist + cleanup session) ----------
class LogoutView(ScopedThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth_logout"

    @extend_schema(
        request={"type": "object", "properties": {"refresh": {"type": "string"}}, "required": ["refresh"]},
        responses={200: OpenApiResponse(description="Déconnecté")},
        tags=["Auth"],
        summary="Déconnexion (blacklist refresh + suppression session)"
    )
    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": _("Paramètre 'refresh' manquant.")}, status=status.HTTP_400_BAD_REQUEST)
        logout_user(refresh=refresh, user=request.user)
        return Response({"detail": "OK"}, status=status.HTTP_200_OK)

# ---------- /me (profil) ----------
class MeView(ScopedThrottleMixin, APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_scope = "auth_me"

    @extend_schema(responses={200: ProfileSerializer}, tags=["Auth"], summary="Mon profil")
    def get(self, request):
        return Response(get_profile(user=request.user))

    @extend_schema(request=ProfileSerializer, responses={200: ProfileSerializer}, tags=["Auth"], summary="Mettre à jour mon profil (username, name)")
    def put(self, request):
        data = {k: v for k, v in request.data.items() if k in ("username", "name")}
        return Response(update_profile(user=request.user, **data))

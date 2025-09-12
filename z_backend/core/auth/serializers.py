from django.contrib.auth import get_user_model, authenticate
from django.core.validators import validate_email
from rest_framework import serializers

User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    """
    Inscription:
      - email normalisé & unique
      - password >= 8 char
      - role obligatoire (Analyste/Contrôleur/Admin)
    """
    password = serializers.CharField(write_only=True, min_length=8, max_length=128)

    class Meta:
        model = User
        fields = ("id", "email", "username", "name", "role", "password")
        extra_kwargs = {
            "id": {"read_only": True},
            "username": {"required": False, "allow_blank": True},
            "name": {"required": False, "allow_blank": True},
        }

    def validate_email(self, value):
        value = User.objects.normalize_email(value).strip()
        validate_email(value)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def create(self, validated_data):
        pwd = validated_data.pop("password")
        validated_data.setdefault("username", validated_data["email"].split("@")[0])
        user = User.objects.create_user(**validated_data, password=pwd)
        return user


class LoginSerializer(serializers.Serializer):
    """
    Connexion:
      - email + password → renvoie un 'user' authentifié
      - les tokens sont construits en couche service
    """
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = User.objects.normalize_email(attrs["email"]).strip()
        password = attrs["password"]
        user = authenticate(request=self.context.get("request"), email=email, password=password)
        if not user:
            # compat fallback si backend = username
            user_qs = User.objects.filter(email__iexact=email)
            if not user_qs.exists() or not user_qs.first().check_password(password):
                raise serializers.ValidationError("Identifiants invalides.")
            user = user_qs.first()
        if not user.is_active:
            raise serializers.ValidationError("Compte inactif.")
        attrs["user"] = user
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    """Profil — lecture/MAJ limitée (username, name)."""
    class Meta:
        model = User
        fields = ("id", "email", "username", "name", "role", "is_active", "date_joined")
        read_only_fields = ("id", "email", "role", "is_active", "date_joined")

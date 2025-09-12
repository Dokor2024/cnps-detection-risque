from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone
from django.core.validators import validate_email
import uuid

# ---------- Manager personnalisé ----------
class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("L'email est requis.")
        email = self.normalize_email(email).strip()
        validate_email(email)

        # Retire 'username' des extra_fields pour éviter le doublon
        raw_username = extra_fields.pop("username", None)
        username = raw_username or email.split("@")[0]

        extra_fields.setdefault("is_active", True)
        user = self.model(email=email, username=username, **extra_fields)
        user.set_password(password)
        user.full_clean(exclude=["password"])  # validations model (sauf hash)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        return self._create_user(email, password or self.make_random_password(), **extra_fields)

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser doit avoir is_staff=True et is_superuser=True.")
        # rôle par défaut si non fourni
        extra_fields.setdefault("role", "Admin")
        return self._create_user(email, password, **extra_fields)

    # Scopes utiles
    def actives(self):
        return self.get_queryset().filter(is_active=True)

    def by_role(self, role: str):
        return self.get_queryset().filter(role=role)

class User(AbstractUser):
    ROLE_CHOICES = [
        ("Analyste", "Analyste"),
        ("Contrôleur", "Contrôleur"),
        ("Admin", "Admin"),
    ]
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(unique=True)
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    #avatar_url = models.FileField(blank=True)
    is_active = models.BooleanField(default=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "role"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
            models.Index(fields=["is_active"]),
            models.Index(fields=["date_joined"]),
        ]
        constraints = [
            models.UniqueConstraint(fields=["email"], name="uq_user_email"),
        ]

    def save(self, *args, **kwargs):
        if self.email:
            self.email = self.__class__.objects.normalize_email(self.email).strip()
        super().save(*args, **kwargs)

class Session(models.Model):
    """Session côté serveur (ex: hash de refresh token pour invalidation/traçabilité)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey("core.User", on_delete=models.CASCADE, related_name="sessions")
    token_hash = models.CharField(max_length=255, db_index=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "sessions"
        indexes = [
            models.Index(fields=["user", "expires_at"]),
            models.Index(fields=["token_hash"]),
        ]

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at

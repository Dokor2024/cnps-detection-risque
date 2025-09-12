from django.db import models
from django.conf import settings
from .base import TimestampedModel
from .employeur import Employeur

class AnomalieQuerySet(models.QuerySet):
    def ouvertes(self):
        return self.exclude(statut__in=["Résolue", "Ignorée"])
    def critiques(self):
        return self.filter(severite="Critique")

class AnomalieManager(models.Manager.from_queryset(AnomalieQuerySet)):  # type: ignore
    pass

class Anomalie(TimestampedModel):
    TYPE_CHOICES = [
        ("Effectif", "Effectif"),
        ("Salaire", "Salaire"),
        ("Déclaration", "Déclaration"),
        ("Géographique", "Géographique"),
    ]
    SEVERITE_CHOICES = [
        ("Faible", "Faible"),
        ("Moyen", "Moyen"),
        ("Élevé", "Élevé"),
        ("Critique", "Critique"),
    ]
    STATUT_CHOICES = [
        ("Nouvelle", "Nouvelle"),
        ("En cours", "En cours"),
        ("Résolue", "Résolue"),
        ("Ignorée", "Ignorée"),
    ]

    employeur = models.ForeignKey(Employeur, on_delete=models.CASCADE, related_name="anomalies")
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    description = models.TextField()
    severite = models.CharField(max_length=20, choices=SEVERITE_CHOICES)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default="Nouvelle")
    valeur_attendue = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    valeur_constatee = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    date_detection = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    # ML
    confidence_score = models.FloatField(default=0.0)
    ml_model_version = models.CharField(max_length=50, blank=True)

    objects = AnomalieManager()

    class Meta:
        db_table = "anomalies"
        indexes = [
            models.Index(fields=["employeur", "statut"]),
            models.Index(fields=["date_detection"]),
            models.Index(fields=["type", "severite"]),
        ]

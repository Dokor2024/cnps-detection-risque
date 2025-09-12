from django.db import models, connection
from django.conf import settings
from .base import TimestampedModel
from .geo import Secteur, Region

# --- Full-text Postgres (optionnel) ---
POSTGRES = connection.vendor == "postgresql"
if POSTGRES:
    from django.contrib.postgres.search import SearchVectorField
    from django.contrib.postgres.indexes import GinIndex
else:
    # Fallback "neutre" pour dev SQLite : on reste compatible migrations
    class SearchVectorField(models.TextField):  # type: ignore
        pass
    class GinIndex(models.Index):              # type: ignore
        def create_sql(self, *args, **kwargs):
            return None

# ---------- QuerySet/Manager spécialisés ----------
class EmployeurQuerySet(models.QuerySet):
    def actifs(self):
        return self.filter(statut="Actif")

    def by_risk(self, niveaux: list[str]):
        return self.filter(niveau_risque__in=niveaux)

    def in_region(self, region_id):
        return self.filter(region_id=region_id)

    def search(self, q: str):
        if not q:
            return self
        if POSTGRES:
            # Simple fallback: ILIKE; le vrai TSearch se fait côté repo/service si besoin
            return self.filter(nom__icontains=q)
        return self.filter(nom__icontains=q)

class EmployeurManager(models.Manager.from_queryset(EmployeurQuerySet)):  # type: ignore
    pass

class Employeur(TimestampedModel):
    STATUT_CHOICES = [
        ("Actif", "Actif"),
        ("Inactif", "Inactif"),
        ("Suspendu", "Suspendu"),
        ("En contrôle", "En contrôle"),
    ]
    NIVEAU_RISQUE_CHOICES = [
        ("Faible", "Faible"),
        ("Moyen", "Moyen"),
        ("Élevé", "Élevé"),
        ("Critique", "Critique"),
    ]

    nom = models.CharField(max_length=255)
    secteur = models.ForeignKey(Secteur, on_delete=models.SET_NULL, null=True, related_name="employeurs")
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, related_name="employeurs")
    ville = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    statut = models.CharField(max_length=50, choices=STATUT_CHOICES, default="Actif")

    # CNPS
    cnps_affilie = models.BooleanField(default=False)
    cnps_numero_affiliation = models.CharField(max_length=100, blank=True)
    cnps_effectif_declare = models.IntegerField(default=0)
    cnps_derniere_maj = models.DateTimeField(null=True, blank=True)

    # Impôts
    impot_numero_contribuable = models.CharField(max_length=100, blank=True)
    impot_effectif_declare = models.IntegerField(default=0)
    impot_chiffre_affaires = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    impot_derniere_maj = models.DateTimeField(null=True, blank=True)

    # Scoring
    score_risque = models.DecimalField(max_digits=3, decimal_places=2, default=0)  # 0.00–9.99
    niveau_risque = models.CharField(max_length=20, choices=NIVEAU_RISQUE_CHOICES, default="Faible")
    last_control_date = models.DateTimeField(null=True, blank=True)

    # Recherche
    search_vector = SearchVectorField(null=True, blank=True)

    objects = EmployeurManager()

    def __str__(self) -> str:
        return self.nom

    class Meta:
        db_table = "employeurs"
        indexes = [
            GinIndex(fields=["search_vector"]) if POSTGRES else models.Index(fields=["nom"]),
            models.Index(fields=["secteur", "region"]),
            models.Index(fields=["statut", "niveau_risque"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

class HistoriqueEffectif(TimestampedModel):
    SOURCE_CHOICES = [
        ("CNPS", "CNPS"),
        ("Impôts", "Impôts"),
        ("Contrôle", "Contrôle"),
    ]
    employeur = models.ForeignKey(Employeur, on_delete=models.CASCADE, related_name="historique_effectifs")
    annee = models.IntegerField()
    mois = models.IntegerField()
    effectif_cnps = models.IntegerField(default=0)
    effectif_impots = models.IntegerField(default=0)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)

    @property
    def ecart(self) -> int:
        return abs(int(self.effectif_cnps) - int(self.effectif_impots))

    class Meta:
        db_table = "historique_effectifs"
        unique_together = [("employeur", "annee", "mois", "source")]
        indexes = [
            models.Index(fields=["employeur", "annee", "mois"]),
            models.Index(fields=["annee", "mois"]),
        ]

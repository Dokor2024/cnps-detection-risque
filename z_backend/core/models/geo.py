from django.db import models
from .base import TimestampedModel

class Secteur(TimestampedModel):
    nom = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)

    def __str__(self) -> str:
        return self.nom

    class Meta:
        db_table = "secteurs"
        verbose_name = "Secteur"
        verbose_name_plural = "Secteurs"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["nom"]),
        ]

class Region(TimestampedModel):
    nom = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)

    def __str__(self) -> str:
        return self.nom

    class Meta:
        db_table = "regions"
        indexes = [
            models.Index(fields=["code"]),
            models.Index(fields=["nom"]),
            models.Index(fields=["latitude", "longitude"]),
        ]

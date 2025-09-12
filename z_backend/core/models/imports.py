from django.db import models
from django.conf import settings
from .base import TimestampedModel

class FileImportQuerySet(models.QuerySet):
    def en_cours(self):
        return self.filter(status="Processing")
    def termines(self):
        return self.filter(status="Completed")
    def echoues(self):
        return self.filter(status="Failed")

class FileImportManager(models.Manager.from_queryset(FileImportQuerySet)):  # type: ignore
    pass

class FileImport(TimestampedModel):
    SOURCE_CHOICES = [
        ("CNPS", "CNPS"),
        ("Impôts", "Impôts"),
        ("Manuel", "Manuel"),
    ]
    STATUS_CHOICES = [
        ("Pending", "En attente"),
        ("Processing", "En cours"),
        ("Completed", "Terminé"),
        ("Failed", "Échoué"),
    ]

    filename = models.CharField(max_length=255)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="Pending")
    total_records = models.IntegerField(default=0)
    processed_records = models.IntegerField(default=0)
    error_records = models.IntegerField(default=0)
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name="imports")
    file_path = models.CharField(max_length=500)
    error_log = models.TextField(blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    objects = FileImportManager()

    @property
    def progress_percentage(self) -> float:
        if self.total_records <= 0:
            return 0.0
        return round((self.processed_records / self.total_records) * 100.0, 2)

    class Meta:
        db_table = "file_imports"
        indexes = [
            models.Index(fields=["source", "status"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["uploaded_by"]),
        ]


class CroisementResult(TimestampedModel):
    import_cnps = models.ForeignKey(FileImport, on_delete=models.CASCADE, related_name="croisements_cnps")
    import_impot = models.ForeignKey(FileImport, on_delete=models.CASCADE, related_name="croisements_impots")
    total_matches = models.IntegerField(default=0)
    cnps_only = models.IntegerField(default=0)
    impot_only = models.IntegerField(default=0)
    ecarts_significatifs = models.IntegerField(default=0)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    # Paramètres utilisés
    tolerance_nom = models.FloatField(default=0.8)
    seuil_ecart = models.IntegerField(default=5)

    class Meta:
        db_table = "croisement_results"
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["created_by"]),
        ]

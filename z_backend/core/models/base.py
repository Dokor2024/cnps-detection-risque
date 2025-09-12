from django.db import models
import uuid

class TimestampedModel(models.Model):
    """Base abstraite avec UUID + timestamps; pensée pour l’archi hexagonale (entités de domaine)."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True, db_index=True)

    class Meta:
        abstract = True
        ordering = ("-created_at",)

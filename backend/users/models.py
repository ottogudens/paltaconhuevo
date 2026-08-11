from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    ROLE_CHOICES = [('admin', 'Admin'), ('vendedor', 'Vendedor'), ('cliente', 'Cliente')]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='cliente')
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    commune = models.CharField(max_length=100, blank=True)
    birth_date = models.DateField(null=True, blank=True)
    # Social profile data
    social_provider = models.CharField(max_length=50, blank=True)
    social_location = models.CharField(max_length=200, blank=True)
    social_interests = models.TextField(blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    # Payment preferences
    PAYMENT_METHOD_CHOICES = [('transferencia', 'Transferencia'), ('efectivo', 'Efectivo')]
    PAYMENT_CONDITION_CHOICES = [('inmediato', 'Inmediato'), ('plazo', 'A Plazo')]
    preferred_payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='efectivo')
    preferred_payment_condition = models.CharField(max_length=20, choices=PAYMENT_CONDITION_CHOICES, default='inmediato')
    whatsapp_number = models.CharField(max_length=20, blank=True)
    email_notifications = models.BooleanField(default=True)
    whatsapp_notifications = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

from django.db import models
from django.conf import settings

class Transaction(models.Model):
    TYPE_CHOICES = [('ingreso','Ingreso'),('egreso','Egreso')]
    CATEGORY_CHOICES = [
        ('venta','Venta'),
        ('compra','Compra de insumos'),
        ('gasto_operacional','Gasto operacional'),
        ('combustible','Combustible'),
        ('cajas','Cajas / Embalaje'),
        ('despacho','Despacho'),
        ('marketing','Marketing'),
        ('otro','Otro')
    ]
    transaction_type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    description = models.CharField(max_length=300)
    reference_id = models.CharField(max_length=100, blank=True)
    date = models.DateField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_transaction_type_display()} - {self.category} - ${self.amount}"

class CompanySettings(models.Model):
    company_name = models.CharField(max_length=200, default='Empresa Demo')
    rut = models.CharField(max_length=20, blank=True)
    address = models.CharField(max_length=300, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    
    # Bank details for transfers
    bank_name = models.CharField(max_length=100, blank=True)
    account_type = models.CharField(max_length=50, blank=True)
    account_number = models.CharField(max_length=100, blank=True)
    account_rut = models.CharField(max_length=20, blank=True)
    account_email = models.EmailField(blank=True)
    account_name = models.CharField(max_length=200, blank=True)

    def save(self, *args, **kwargs):
        # Only allow one instance (singleton)
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, created = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return "Configuración de la Empresa"

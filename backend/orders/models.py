from django.db import models
from django.conf import settings
from products.models import Product

class Order(models.Model):
    STATUS_CHOICES = [('pendiente','Pendiente'),('preparando','Preparando'),('en_camino','En camino'),('entregado','Entregado'),('cancelado','Cancelado')]
    DELIVERY_CHOICES = [('despacho','Despacho a domicilio'),('retiro','Retiro en local')]
    PAYMENT_METHOD_CHOICES = [('transferencia','Transferencia'),('efectivo','Efectivo'),('mercadopago','MercadoPago')]
    PAYMENT_CONDITION_CHOICES = [('inmediato','Inmediato'),('plazo','A Plazo')]
    PAYMENT_STATUS_CHOICES = [('pendiente','Pendiente'),('pagado','Pagado'),('vencido','Vencido')]

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendiente')
    delivery_type = models.CharField(max_length=20, choices=DELIVERY_CHOICES, default='retiro')
    delivery_address = models.TextField(blank=True)
    delivery_commune = models.CharField(max_length=100, blank=True)
    delivery_reference = models.CharField(max_length=200, blank=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='efectivo')
    payment_condition = models.CharField(max_length=20, choices=PAYMENT_CONDITION_CHOICES, default='inmediato')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pendiente')
    payment_due_date = models.DateField(null=True, blank=True)
    mercadopago_preference_id = models.CharField(max_length=200, blank=True)
    mercadopago_payment_id = models.CharField(max_length=200, blank=True)
    mercadopago_link = models.URLField(blank=True)
    subtotal = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    delivery_cost = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    points_earned = models.IntegerField(default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pedido #{self.id} - {self.customer} - ${self.total}"

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=0)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    subtotal = models.DecimalField(max_digits=12, decimal_places=0)
    margin = models.DecimalField(max_digits=12, decimal_places=0, default=0)

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        self.margin = self.subtotal - (self.quantity * self.unit_cost)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

from django.db import models
from django.conf import settings
from products.models import Product

class Order(models.Model):
    STATUS_CHOICES = [('pendiente','Pendiente'),('preparando','Preparando'),('en_camino','En camino'),('parcialmente_entregado','Parcialmente Entregado'),('entregado','Entregado'),('cancelado','Cancelado')]
    DELIVERY_CHOICES = [('despacho','Despacho a domicilio'),('retiro','Retiro en local')]
    PAYMENT_METHOD_CHOICES = [('transferencia','Transferencia'),('efectivo','Efectivo'),('mercadopago','MercadoPago')]
    PAYMENT_CONDITION_CHOICES = [('inmediato','Inmediato'),('plazo','A Plazo')]
    PAYMENT_STATUS_CHOICES = [('pendiente','Pendiente'),('abonado','Abonado'),('pagado','Pagado'),('vencido','Vencido')]

    customer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name='orders')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='pendiente')
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
    status = models.CharField(max_length=25, choices=Order.STATUS_CHOICES, default='pendiente')

    def save(self, *args, **kwargs):
        self.subtotal = self.quantity * self.unit_price
        self.margin = self.subtotal - (self.quantity * self.unit_cost)
        super().save(*args, **kwargs)
        
        # Actualizar el estado general del pedido si todos los items se entregan
        if self.order.id:
            items = self.order.items.all()
            if items.exists():
                statuses = set(item.status for item in items)
                if len(statuses) == 1:
                    new_status = statuses.pop()
                    if self.order.status != new_status:
                        self.order.status = new_status
                        self.order.save(update_fields=['status'])
                else:
                    if 'entregado' in statuses and self.order.status != 'parcialmente_entregado':
                        self.order.status = 'parcialmente_entregado'
                        self.order.save(update_fields=['status'])

    def __str__(self):
        return f"{self.product.name} x{self.quantity}"

class OrderPayment(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=0)
    payment_method = models.CharField(max_length=20, choices=Order.PAYMENT_METHOD_CHOICES, default='transferencia')
    date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Update order payment_status
            total_paid = sum(p.amount for p in self.order.payments.all())
            if total_paid >= self.order.total:
                self.order.payment_status = 'pagado'
            else:
                self.order.payment_status = 'abonado'
            self.order.save(update_fields=['payment_status'])
            
            # Create transaction in finance
            from finance.models import Transaction
            import datetime
            Transaction.objects.create(
                transaction_type='ingreso',
                category='venta',
                amount=self.amount,
                description=f"Abono Pedido #{self.order.id} ({self.get_payment_method_display()})",
                reference_id=f"ORDER-{self.order.id}",
                date=self.date.date() if self.date else datetime.date.today(),
                created_by=self.created_by
            )

    def __str__(self):
        return f"Abono ${self.amount} - Pedido #{self.order.id}"

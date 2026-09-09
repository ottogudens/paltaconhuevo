from django.db import models

class ProductCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)
    emoji = models.CharField(max_length=10, blank=True, default='📦')

    def __str__(self):
        return self.name

class Product(models.Model):
    UNIT_CHOICES = [('unidad', 'Unidad'), ('kilo', 'Kilo'), ('docena', 'Docena'), ('caja', 'Caja')]
    name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES, default='unidad')
    purchase_price = models.DecimalField(max_digits=10, decimal_places=0, default=0)
    sale_price = models.DecimalField(max_digits=10, decimal_places=0)
    stock = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    min_stock = models.DecimalField(max_digits=10, decimal_places=2, default=5)
    image = models.ImageField(upload_to='products/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_bundle = models.BooleanField(default=False, help_text="Si es true, este producto es un combo de otros productos")
    can_be_sold = models.BooleanField(default=True, help_text="Si es falso, no aparecerá en el menú de ventas")
    purchase_multiplier = models.DecimalField(max_digits=10, decimal_places=0, default=1, help_text="Multiplica unidades al comprar")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['is_bundle']),
            models.Index(fields=['can_be_sold']),
        ]

    def __str__(self):
        return f"{self.name} (${self.sale_price}/{self.unit})"

class Purchase(models.Model):
    PAYMENT_STATUS_CHOICES = [('pendiente_pago', 'Pendiente de pago'), ('abono', 'Abono'), ('pagado', 'Pagado')]
    supplier_name = models.CharField(max_length=200, default='Proveedor')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchases')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=0)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pagado')
    paid_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    purchase_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def _update_stock(self, product, amount):
        from decimal import Decimal
        if product.is_bundle:
            for comp in product.components.all():
                comp.product.stock += Decimal(str(amount)) * comp.quantity
                comp.product.save(update_fields=['stock'])
        else:
            product.stock += Decimal(str(amount))
            product.save(update_fields=['stock'])

    def save(self, *args, **kwargs):
        if kwargs.get('raw', False):
            super().save(*args, **kwargs)
            return
        
        is_new = self.pk is None
        old_purchase = None
        if not is_new:
            old_purchase = Purchase.objects.get(pk=self.pk)

        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)
        
        if is_new:
            effective_diff = self.quantity * self.product.purchase_multiplier
            self._update_stock(self.product, effective_diff)
        else:
            if old_purchase.product == self.product:
                stock_diff = self.quantity - old_purchase.quantity
                effective_diff = stock_diff * self.product.purchase_multiplier
                if effective_diff != 0:
                    self._update_stock(self.product, effective_diff)
            else:
                # Revert stock from old product
                old_effective = old_purchase.quantity * old_purchase.product.purchase_multiplier
                self._update_stock(old_purchase.product, -old_effective)
                # Add stock to new product
                new_effective = self.quantity * self.product.purchase_multiplier
                self._update_stock(self.product, new_effective)

    def delete(self, *args, **kwargs):
        effective_quantity = self.quantity * self.product.purchase_multiplier
        self._update_stock(self.product, -effective_quantity)
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Compra {self.product.name} x{self.quantity} - ${self.total_cost}"

class ProductComponent(models.Model):
    bundle = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='components')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='part_of_bundles')
    quantity = models.DecimalField(max_digits=10, decimal_places=6)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} en {self.bundle.name}"

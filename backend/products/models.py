from django.db import models

class Product(models.Model):
    UNIT_CHOICES = [('unidad', 'Unidad'), ('kilo', 'Kilo'), ('docena', 'Docena'), ('caja', 'Caja')]
    TYPE_CHOICES = [('palta', 'Palta'), ('huevo', 'Huevo'), ('otro', 'Otro')]
    name = models.CharField(max_length=200)
    product_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
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

    def __str__(self):
        return f"{self.name} (${self.sale_price}/{self.unit})"

class Purchase(models.Model):
    supplier_name = models.CharField(max_length=200, default='Proveedor')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='purchases')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_cost = models.DecimalField(max_digits=10, decimal_places=0)
    total_cost = models.DecimalField(max_digits=12, decimal_places=0)
    purchase_date = models.DateField()
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        stock_diff = self.quantity
        if not is_new:
            old_purchase = Purchase.objects.get(pk=self.pk)
            stock_diff = self.quantity - old_purchase.quantity

        effective_diff = stock_diff * self.product.purchase_multiplier

        self.total_cost = self.quantity * self.unit_cost
        super().save(*args, **kwargs)
        
        if effective_diff != 0:
            if self.product.is_bundle:
                for comp in self.product.components.all():
                    comp.product.stock += effective_diff * comp.quantity
                    comp.product.save(update_fields=['stock'])
            else:
                self.product.stock += effective_diff
                self.product.save(update_fields=['stock'])

    def delete(self, *args, **kwargs):
        effective_quantity = self.quantity * self.product.purchase_multiplier

        if self.product.is_bundle:
            for comp in self.product.components.all():
                comp.product.stock -= effective_quantity * comp.quantity
                comp.product.save(update_fields=['stock'])
        else:
            self.product.stock -= effective_quantity
            self.product.save(update_fields=['stock'])
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Compra {self.product.name} x{self.quantity} - ${self.total_cost}"

class ProductComponent(models.Model):
    bundle = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='components')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name='part_of_bundles')
    quantity = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantity} x {self.product.name} en {self.bundle.name}"

# Generated manually
from django.db import migrations
from decimal import Decimal
import math

def update_bundles(apps, schema_editor):
    Product = apps.get_model('products', 'Product')
    ProductComponent = apps.get_model('products', 'ProductComponent')
    
    # Iterate all bundles and update their stock and purchase_price in the DB
    for bundle in Product.objects.filter(is_bundle=True):
        total_cost = Decimal('0')
        possible_assemblies = []
        
        components = ProductComponent.objects.filter(bundle=bundle)
        if components.exists():
            for comp in components:
                # Component cost
                comp_cost = comp.product.purchase_price if comp.product.purchase_price else Decimal('0')
                total_cost += comp_cost * comp.quantity
                
                # Component stock ratio
                if comp.quantity > 0:
                    ratio = float(comp.product.stock) / float(comp.quantity)
                    possible_assemblies.append(ratio)
                    
            bundle.purchase_price = total_cost
            if possible_assemblies:
                min_asm = math.floor(min(possible_assemblies))
                bundle.stock = Decimal(str(min_asm if min_asm > 0 else 0))
            else:
                bundle.stock = Decimal('0')
        else:
            bundle.purchase_price = Decimal('0')
            bundle.stock = Decimal('0')
            
        bundle.save(update_fields=['purchase_price', 'stock'])


def revert_bundles(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_product_purchase_price'),
    ]

    operations = [
        migrations.RunPython(update_bundles, revert_bundles),
    ]

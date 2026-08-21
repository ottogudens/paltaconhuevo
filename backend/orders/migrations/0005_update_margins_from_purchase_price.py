# Generated manually
from django.db import migrations
from decimal import Decimal

def update_margins(apps, schema_editor):
    OrderItem = apps.get_model('orders', 'OrderItem')
    ProductComponent = apps.get_model('products', 'ProductComponent')
    
    for item in OrderItem.objects.all():
        product = item.product
        unit_price = item.unit_price
        qty = item.quantity
        
        if product.is_bundle:
            bundle_cost = Decimal('0')
            for comp in ProductComponent.objects.filter(bundle=product):
                comp_cost = comp.product.purchase_price if comp.product.purchase_price else Decimal('0')
                bundle_cost += comp_cost * comp.quantity
            item.unit_cost = bundle_cost
        else:
            item.unit_cost = product.purchase_price if product.purchase_price else Decimal('0')
            
        item.margin = item.subtotal - (qty * item.unit_cost)
        item.save(update_fields=['unit_cost', 'margin'])

def revert_margins(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_order_discount_order_points_awarded'),
        ('products', '0004_update_bundle_stock_and_cost'),
    ]

    operations = [
        migrations.RunPython(update_margins, revert_margins),
    ]

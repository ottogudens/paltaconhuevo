"""Script para inicializar la base de datos con datos de ejemplo"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth import get_user_model
from products.models import Product
from users.models import User
from loyalty.models import LoyaltyAccount

User = get_user_model()

# Crear superuser admin
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@paltaconhuevo.cl',
        password='admin123',
        first_name='Admin',
        role='admin'
    )
    print("✅ Admin user created: admin / admin123")

# Crear usuario vendedor de ejemplo
if not User.objects.filter(username='vendedor').exists():
    vendor = User.objects.create_user(
        username='vendedor',
        email='vendedor@paltaconhuevo.cl',
        password='vendedor123',
        first_name='Vendedor',
        role='vendedor'
    )
    print("✅ Vendor user created: vendedor / vendedor123")

# Crear productos de ejemplo
products_data = [
    {'name': 'Palta Hass', 'product_type': 'palta', 'unit': 'unidad', 'sale_price': 3500},
    {'name': 'Palta Fuerte', 'product_type': 'palta', 'unit': 'unidad', 'sale_price': 2500},
    {'name': 'Huevos de Granja', 'product_type': 'huevo', 'unit': 'docena', 'sale_price': 8500},
    {'name': 'Huevos Orgánicos', 'product_type': 'huevo', 'unit': 'docena', 'sale_price': 12000},
]

for data in products_data:
    if not Product.objects.filter(name=data['name']).exists():
        Product.objects.create(**data, stock=100, min_stock=10)
        print(f"✅ Product created: {data['name']}")

# Crear algunos clientes de ejemplo
for i in range(5):
    if not User.objects.filter(username=f'cliente{i}').exists():
        customer = User.objects.create_user(
            username=f'cliente{i}',
            email=f'cliente{i}@example.com',
            password='cliente123',
            first_name=f'Cliente {i}',
            phone=f'+56912345{100+i}',
            role='cliente'
        )
        LoyaltyAccount.objects.create(user=customer)
        print(f"✅ Customer created: cliente{i}")

print("\n✅ Database initialized successfully!")

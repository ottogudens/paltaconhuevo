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

# Solo asegurar superuser admin y vendedor si no existen
if not User.objects.filter(username='admin').exists():
    admin = User.objects.create_superuser(
        username='admin',
        email='admin@paltaconhuevo.cl',
        password='admin123',
        first_name='Admin',
        role='admin'
    )
    print("✅ Admin user created: admin / admin123")

if not User.objects.filter(username='vendedor').exists():
    vendor = User.objects.create_user(
        username='vendedor',
        email='vendedor@paltaconhuevo.cl',
        password='vendedor123',
        first_name='Vendedor',
        role='vendedor'
    )
    print("✅ Vendor user created: vendedor / vendedor123")

print("\n✅ Database initialized successfully!")

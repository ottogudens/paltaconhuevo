import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "core.settings")
django.setup()

from orders.views import OrderListCreateView
from decimal import Decimal

# just dry run syntax compilation
import py_compile
py_compile.compile('orders/views.py')
print('Syntax OK')

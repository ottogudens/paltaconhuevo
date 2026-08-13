from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from finance.models import Transaction

User = get_user_model()


class FinanceTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_superuser(username='admin1', password='adminpassword', role='admin')
        self.client.force_authenticate(user=self.admin)

    def test_create_transaction(self):
        response = self.client.post('/api/finance/', {
            'transaction_type': 'ingreso',
            'category': 'venta',
            'amount': 50000,
            'description': 'Venta directa en local',
            'date': '2026-02-10'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transaction.objects.count(), 1)
        t = Transaction.objects.first()
        self.assertEqual(t.amount, 50000)
        self.assertEqual(t.category, 'venta')

    def test_finance_summary_metrics(self):
        import datetime
        today = datetime.date.today()
        Transaction.objects.create(
            transaction_type='ingreso', category='venta', amount=100000, description='Ventas', date=today
        )
        Transaction.objects.create(
            transaction_type='egreso', category='compra', amount=40000, description='Insumos', date=today
        )

        response = self.client.get('/api/finance/summary/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('ingresos', response.data)
        self.assertEqual(response.data['ingresos'], 100000)
        self.assertEqual(response.data['egresos'], 40000)
        self.assertEqual(response.data['balance'], 60000)


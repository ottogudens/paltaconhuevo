from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch

from products.models import Product, Purchase
from orders.models import Order, OrderItem
from loyalty.models import LoyaltyAccount, PointTransaction

User = get_user_model()


class OrderTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='cliente1', password='password123', first_name='Juan')
        self.admin = User.objects.create_superuser(username='admin1', password='adminpassword', role='admin')
        
        # Crear producto
        self.product = Product.objects.create(
            name='Palta Hass',
            product_type='palta',
            sale_price=3000,
            unit='kilo',
            stock=50
        )
        
        # Registrar compras de insumos/productos para verificar cálculo de costo unitario
        Purchase.objects.create(
            product=self.product,
            quantity=10,
            unit_cost=1500,
            total_cost=15000,
            purchase_date='2026-01-01'
        )
        Purchase.objects.create(
            product=self.product,
            quantity=10,
            unit_cost=1800,  # Más reciente -> este costo debe tomarse
            total_cost=18000,
            purchase_date='2026-02-01'
        )

    def test_create_order_calculates_margin_and_unit_cost_correctly(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/orders/', {
            'customer_id': self.user.id,
            'items': [
                {'product_id': self.product.id, 'quantity': 2, 'unit_price': 3000}
            ],
            'delivery_type': 'despacho',
            'payment_method': 'mercadopago'
        }, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get(id=response.data['id'])
        self.assertEqual(order.total, 6000)

        # Verificar item
        item = order.items.first()
        self.assertEqual(float(item.unit_cost), 1800)  # El costo más reciente (order_by('-purchase_date'))
        self.assertEqual(float(item.subtotal), 6000)
        self.assertEqual(float(item.margin), 6000 - (2 * 1800))  # 2400

    @patch('mercadopago.SDK')
    def test_mercadopago_webhook_idempotency_and_loyalty_credit(self, mock_sdk):
        # Configurar mock de MercadoPago SDK
        mock_instance = mock_sdk.return_value
        mock_instance.payment.return_value.get.return_value = {
            "response": {
                "status": "approved",
                "external_reference": str(1)
            }
        }

        # Crear orden
        order = Order.objects.create(
            customer=self.user,
            total=10000,
            points_earned=100,
            payment_status='pendiente'
        )

        # Primer llamado al webhook -> Debe aprobar la orden y sumar puntos
        response1 = self.client.post('/api/orders/webhook/mercadopago/', {
            'type': 'payment',
            'data': {'id': 'MP-PAYMENT-123'}
        }, format='json')

        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pagado')
        self.assertEqual(order.mercadopago_payment_id, 'MP-PAYMENT-123')

        # Verificar puntos asignados
        loyalty = LoyaltyAccount.objects.get(user=self.user)
        self.assertEqual(loyalty.points, 100)
        self.assertEqual(loyalty.total_points_earned, 100)

        # Segundo llamado al webhook (notificación repetida / reintento) -> Debe ser ignorada (idempotente)
        response2 = self.client.post('/api/orders/webhook/mercadopago/', {
            'type': 'payment',
            'data': {'id': 'MP-PAYMENT-123'}
        }, format='json')

        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['status'], 'already_processed')
        
        # Puntos deben seguir siendo 100 (no duplicados)
        loyalty.refresh_from_db()
        self.assertEqual(loyalty.points, 100)

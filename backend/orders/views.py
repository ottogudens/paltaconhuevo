from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from django.conf import settings
import mercadopago
import openpyxl
from .models import Order, OrderItem
from .serializers import OrderSerializer, OrderItemSerializer
from products.models import Product
from finance.models import Transaction
from rest_framework.permissions import AllowAny, IsAuthenticated
from core.permissions import IsAdminOrVendedor, IsOwnerOrAdmin
import datetime


class OrderListCreateView(generics.ListCreateAPIView):
    """
    Clientes solo ven sus pedidos; admin/vendedor ven todos.
    La lógica de filtrado ya existe en get_queryset — solo necesitamos
    que sea IsAuthenticated para que cualquier usuario logueado pueda crear
    su propio pedido.
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'vendedor']:
            qs = Order.objects.all().order_by('-created_at')
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        return Order.objects.filter(customer=user).order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.get('items', [])
        order = Order.objects.create(
            customer_id=data.get('customer_id', request.user.id),
            delivery_type=data.get('delivery_type', 'retiro'),
            delivery_address=data.get('delivery_address', ''),
            delivery_commune=data.get('delivery_commune', ''),
            delivery_reference=data.get('delivery_reference', ''),
            payment_method=data.get('payment_method', 'efectivo'),
            payment_condition=data.get('payment_condition', 'inmediato'),
            notes=data.get('notes', ''),
        )
        subtotal = 0
        for item in items_data:
            product = Product.objects.get(id=item['product_id'])
            qty = float(item['quantity'])
            unit_price = float(item.get('unit_price', product.sale_price))
            # A5 fix: usar order_by explícito para obtener el costo más reciente
            last_purchase = product.purchases.order_by('-purchase_date').first()
            unit_cost = float(last_purchase.unit_cost) if last_purchase else 0
            oi = OrderItem.objects.create(
                order=order, product=product, quantity=qty,
                unit_price=unit_price, unit_cost=unit_cost,
            )
            subtotal += float(oi.subtotal)
            product.stock -= qty
            product.save()
        order.subtotal = subtotal
        order.total = subtotal + float(order.delivery_cost)
        from django.conf import settings as conf
        points = int(order.total / 1000) * conf.POINTS_PER_THOUSAND
        order.points_earned = points
        order.save()
        try:
            acc = order.customer.loyalty
            acc.points += points
            acc.total_points_earned += points
            acc.total_purchases += order.total
            acc.update_level()
        except Exception:
            pass
        Transaction.objects.create(
            transaction_type='ingreso', category='venta',
            amount=order.total, description=f'Pedido #{order.id}',
            reference_id=str(order.id), date=datetime.date.today(),
            created_by=request.user,
        )
        return Response(OrderSerializer(order).data, status=status.HTTP_201_CREATED)


class OrderDetailView(generics.RetrieveUpdateAPIView):
    """
    El propietario del pedido o un admin/vendedor pueden ver/editar.
    """
    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    permission_classes = [IsOwnerOrAdmin]


class GenerateMercadoPagoView(APIView):
    """Solo el propietario o staff pueden generar el link de pago."""
    permission_classes = [IsOwnerOrAdmin]

    def post(self, request, pk):
        order = Order.objects.get(pk=pk)
        self.check_object_permissions(request, order)
        sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
        preference_data = {
            "items": [{"title": f"Pedido #{order.id} - Palta con Huevo", "quantity": 1, "unit_price": float(order.total)}],
            "payer": {"email": order.customer.email},
            "back_urls": {
                "success": f"{settings.WHATSAPP_SERVICE_URL}/mp/success",
                "failure": f"{settings.WHATSAPP_SERVICE_URL}/mp/failure",
            },
            "auto_return": "approved",
            "notification_url": f"{settings.WHATSAPP_SERVICE_URL}/api/orders/webhook/mercadopago/",
            "external_reference": str(order.id),
        }
        result = sdk.preference().create(preference_data)
        preference = result["response"]
        order.mercadopago_preference_id = preference["id"]
        order.mercadopago_link = preference["init_point"]
        order.save()
        return Response({"link": preference["init_point"], "preference_id": preference["id"]})


class MercadoPagoWebhookView(APIView):
    """
    Webhook externo de MercadoPago — debe ser AllowAny.
    TODO (M7): agregar verificación de idempotencia para evitar doble procesamiento.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        if data.get('type') == 'payment':
            payment_id = data.get('data', {}).get('id')
            sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
            payment = sdk.payment().get(payment_id)["response"]
            if payment.get('status') == 'approved':
                order_id = payment.get('external_reference')
                try:
                    order = Order.objects.get(id=order_id)
                    order.payment_status = 'pagado'
                    order.mercadopago_payment_id = str(payment_id)
                    order.save()
                except Exception:
                    pass
        return Response({'status': 'ok'})


class ExportOrdersView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Pedidos"
        ws.append(['ID', 'Cliente', 'Total', 'Estado', 'Tipo entrega', 'Dirección', 'Método pago', 'Estado pago', 'Fecha'])
        for o in Order.objects.all().order_by('-created_at'):
            ws.append([o.id, o.customer.get_full_name(), float(o.total), o.status,
                       o.delivery_type, o.delivery_address, o.payment_method,
                       o.payment_status, str(o.created_at.date())])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="pedidos.xlsx"'
        wb.save(response)
        return response


class DashboardView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        from django.db.models import Sum, Count
        from django.utils import timezone
        today = datetime.date.today()
        month_start = today.replace(day=1)
        orders_today = Order.objects.filter(created_at__date=today)
        orders_month = Order.objects.filter(created_at__date__gte=month_start)
        from products.models import Product
        from users.models import User
        return Response({
            'sales_today': float(orders_today.aggregate(t=Sum('total'))['t'] or 0),
            'sales_month': float(orders_month.aggregate(t=Sum('total'))['t'] or 0),
            'orders_today': orders_today.count(),
            'orders_pending': Order.objects.filter(status='pendiente').count(),
            'orders_in_transit': Order.objects.filter(status='en_camino').count(),
            'accounts_receivable': float(
                Order.objects.filter(payment_status='pendiente', payment_condition='plazo')
                .aggregate(t=Sum('total'))['t'] or 0
            ),
            'total_customers': User.objects.filter(role='cliente').count(),
            'low_stock_count': sum(1 for p in Product.objects.filter(is_active=True) if p.stock <= p.min_stock),
        })

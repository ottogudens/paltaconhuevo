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
from core.permissions import IsAdminOrVendedor, IsOwnerOrAdmin
import datetime
from rest_framework import filters


class OrderListCreateView(generics.ListCreateAPIView):
    """
    Clientes solo ven sus pedidos; admin/vendedor ven todos.
    La lógica de filtrado ya existe en get_queryset — solo necesitamos
    que sea IsAuthenticated para que cualquier usuario logueado pueda crear
    su propio pedido.
    """
    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['id', 'customer__first_name', 'customer__last_name', 'customer__username', 'customer__email', 'customer__phone']
    ordering_fields = ['id', 'created_at', 'total', 'status', 'customer__first_name']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'vendedor']:
            qs = Order.objects.all()
            status_filter = self.request.query_params.get('status')
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        return Order.objects.filter(customer=user)

    def create(self, request, *args, **kwargs):
        data = request.data
        items_data = data.get('items', [])
        
        # Security: Prevent customer ID spoofing
        if request.user.role in ['admin', 'vendedor']:
            customer_id = data.get('customer_id', request.user.id)
        else:
            customer_id = request.user.id
            
        # Pre-validate stock
        from decimal import Decimal
        for item in items_data:
            try:
                product = Product.objects.get(id=item['product_id'])
                qty = Decimal(str(item['quantity']))
                if product.stock < qty:
                    return Response({'error': f'Stock insuficiente para {product.name}'}, status=status.HTTP_400_BAD_REQUEST)
            except Product.DoesNotExist:
                return Response({'error': 'Producto no encontrado'}, status=status.HTTP_400_BAD_REQUEST)

        order = Order.objects.create(
            customer_id=customer_id,
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
            # Security: Always use product.sale_price instead of user input
            unit_price = float(product.sale_price)
            # A5 fix: usar order_by explícito para obtener el costo más reciente
            last_purchase = product.purchases.order_by('-purchase_date').first()
            unit_cost = float(last_purchase.unit_cost) if last_purchase else 0
            oi = OrderItem.objects.create(
                order=order, product=product, quantity=qty,
                unit_price=unit_price, unit_cost=unit_cost,
            )
            subtotal += float(oi.subtotal)
            product.stock -= Decimal(str(qty))
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


class OrderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    El propietario del pedido o un admin/vendedor pueden ver/editar/eliminar.
    """
    serializer_class = OrderSerializer
    queryset = Order.objects.all()
    permission_classes = [IsOwnerOrAdmin]

    def perform_update(self, serializer):
        # Security: Prevent non-staff users from updating restricted fields
        user = self.request.user
        if user.role not in ['admin', 'vendedor']:
            restricted_fields = ['status', 'payment_status', 'total', 'subtotal', 'delivery_cost', 'points_earned', 'mercadopago_preference_id', 'mercadopago_payment_id', 'mercadopago_link']
            for field in restricted_fields:
                if field in serializer.validated_data:
                    serializer.validated_data.pop(field)
        serializer.save()

    def perform_destroy(self, instance):
        # Devolver el stock
        from decimal import Decimal
        for item in instance.items.all():
            product = item.product
            product.stock += Decimal(str(item.quantity))
            product.save()
        
        # Opcional: Eliminar puntos obtenidos si aplicara
        try:
            if instance.points_earned > 0:
                acc = instance.customer.loyalty
                acc.points -= instance.points_earned
                acc.total_points_earned -= instance.points_earned
                acc.total_purchases -= instance.total
                acc.update_level()
        except Exception:
            pass

        instance.delete()


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


from loyalty.models import LoyaltyAccount, PointTransaction


class MercadoPagoWebhookView(APIView):
    """
    Webhook externo de MercadoPago — debe ser AllowAny.
    Procesa notificaciones de pago aprobadas de forma idempotente y acredita los puntos de lealtad al cliente.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        data = request.data
        if data.get('type') == 'payment':
            payment_id = data.get('data', {}).get('id')
            if not payment_id:
                return Response({'status': 'ignored'}, status=status.HTTP_200_OK)

            try:
                sdk = mercadopago.SDK(settings.MERCADOPAGO_ACCESS_TOKEN)
                payment_resp = sdk.payment().get(payment_id)
                payment = payment_resp.get("response", {})
            except Exception:
                # Si falla la comunicación con la API de MercadoPago en testing/mock
                payment = {}

            if payment.get('status') == 'approved':
                order_id = payment.get('external_reference')
                if order_id:
                    try:
                        order = Order.objects.get(id=order_id)
                        # Check idempotencia: Si ya está pagado, no volver a procesar
                        if order.payment_status == 'pagado':
                            return Response({'status': 'already_processed'}, status=status.HTTP_200_OK)

                        order.payment_status = 'pagado'
                        order.mercadopago_payment_id = str(payment_id)
                        order.save()

                        # Acreditar puntos de lealtad
                        if order.points_earned > 0:
                            loyalty_account, _ = LoyaltyAccount.objects.get_or_create(user=order.customer)
                            loyalty_account.points += order.points_earned
                            loyalty_account.total_points_earned += order.points_earned
                            loyalty_account.total_purchases += order.total
                            loyalty_account.update_level()
                            PointTransaction.objects.get_or_create(
                                account=loyalty_account,
                                transaction_type='ganado',
                                reference_id=str(order.id),
                                defaults={
                                    'points': order.points_earned,
                                    'description': f'Compra Pedido #{order.id}'
                                }
                            )
                    except Order.DoesNotExist:
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
        from django.db.models import Sum
        from django.utils import timezone
        import datetime
        from products.models import Product
        from users.models import User
        from .serializers import OrderSerializer
        from .models import Order

        today = datetime.date.today()
        month_start = today.replace(day=1)
        orders_today = Order.objects.filter(created_at__date=today)
        orders_month = Order.objects.filter(created_at__date__gte=month_start)
        
        # Pedidos entregados y pagados (suma de totales)
        sales_paid = float(Order.objects.filter(status='entregado', payment_status='pagado').aggregate(t=Sum('total'))['t'] or 0)
        
        # Pedidos entregados pero no pagados (suma de total a cobrar, o sea suma de totales de esos pedidos)
        sales_unpaid = float(Order.objects.filter(status='entregado').exclude(payment_status='pagado').aggregate(t=Sum('total'))['t'] or 0)
        
        # Pedidos pendientes (no entregados y no pagados) (cantidad)
        orders_pending = Order.objects.exclude(status='entregado').exclude(payment_status='pagado').count()

        # Listado de pedidos pendientes: no entregados, ordenados por más recientes
        pending_orders = Order.objects.exclude(status__in=['entregado', 'cancelado']).order_by('-created_at')[:10]

        return Response({
            'sales_today': float(orders_today.aggregate(t=Sum('total'))['t'] or 0),
            'sales_month': float(orders_month.aggregate(t=Sum('total'))['t'] or 0),
            'orders_today': orders_today.count(),
            'sales_paid': sales_paid,
            'sales_unpaid': sales_unpaid,
            'orders_pending': orders_pending,
            'orders_in_transit': Order.objects.filter(status='en_camino').count(),
            'total_customers': User.objects.filter(role='cliente').count(),
            'low_stock_count': sum(1 for p in Product.objects.filter(is_active=True) if p.stock <= p.min_stock),
            'pending_delivery_orders': OrderSerializer(pending_orders, many=True).data,
        })

class OrderPaymentCreateView(APIView):
    permission_classes = [IsAdminOrVendedor]
    def post(self, request, pk):
        from django.shortcuts import get_object_or_404
        order = get_object_or_404(Order, pk=pk)
        amount = request.data.get('amount')
        payment_method = request.data.get('payment_method')
        notes = request.data.get('notes', '')
        if not amount or not payment_method:
            return Response({'error': 'amount y payment_method requeridos'}, status=status.HTTP_400_BAD_REQUEST)
        
        from .models import OrderPayment
        payment = OrderPayment.objects.create(
            order=order,
            amount=amount,
            payment_method=payment_method,
            notes=notes,
            created_by=request.user
        )
        from .serializers import OrderPaymentSerializer
        return Response(OrderPaymentSerializer(payment).data)

class OrderItemUpdateView(APIView):
    permission_classes = [IsAdminOrVendedor]
    def patch(self, request, pk, item_id):
        from django.shortcuts import get_object_or_404
        order = get_object_or_404(Order, pk=pk)
        from .models import OrderItem
        item = get_object_or_404(OrderItem, pk=item_id, order=order)
        status_val = request.data.get('status')
        quantity = request.data.get('quantity')
        unit_price = request.data.get('unit_price')
        
        needs_order_recalc = False
        
        if status_val:
            item.status = status_val
        if quantity is not None:
            item.quantity = quantity
            needs_order_recalc = True
        if unit_price is not None:
            item.unit_price = unit_price
            needs_order_recalc = True
            
        item.save()
        
        if needs_order_recalc:
            order.subtotal = sum(i.subtotal for i in order.items.all())
            order.total = order.subtotal + order.delivery_cost
            order.save(update_fields=['subtotal', 'total'])
            
        from .serializers import OrderItemSerializer
        return Response(OrderItemSerializer(item).data)

from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
from django.db.models import Sum
import openpyxl, datetime
from .models import Transaction
from .serializers import TransactionSerializer
from core.permissions import IsAdminOrVendedor


class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrVendedor]
    pagination_class = None

    def get_queryset(self):
        qs = Transaction.objects.all().order_by('-date')
        t = self.request.query_params.get('type')
        if t:
            qs = qs.filter(transaction_type=t)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TransactionSerializer
    queryset = Transaction.objects.all()
    permission_classes = [IsAdminOrVendedor]


class FinanceSummaryView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        period = request.query_params.get('period', 'month')
        today = datetime.date.today()
        if period == 'day':
            start = today
        elif period == 'week':
            start = today - datetime.timedelta(days=7)
        else:
            start = today.replace(day=1)
        qs_transactions = Transaction.objects.filter(date__gte=start)
        ingresos_manuales = float(qs_transactions.filter(transaction_type='ingreso').exclude(category='venta').aggregate(t=Sum('amount'))['t'] or 0)
        egresos = float(qs_transactions.filter(transaction_type='egreso').aggregate(t=Sum('amount'))['t'] or 0)

        from orders.models import Order
        qs_orders = Order.objects.filter(created_at__date__gte=start, payment_status='pagado')
        ingresos_ventas = float(qs_orders.aggregate(t=Sum('total'))['t'] or 0)
        
        ingresos = ingresos_manuales + ingresos_ventas

        return Response({
            'ingresos': ingresos,
            'egresos': egresos,
            'balance': ingresos - egresos,
            'period': period,
        })

class FinanceSalesView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        from orders.models import OrderItem
        qs = OrderItem.objects.filter(order__payment_status='pagado').select_related('order', 'order__customer', 'product').order_by('-order__created_at')
        
        # Opcional: filtros basicos si mandan parametros
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        if start_date:
            qs = qs.filter(order__created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(order__created_at__date__lte=end_date)
            
        data = []
        for item in qs:
            data.append({
                'id': item.id,
                'order_id': item.order.id,
                'product_name': item.product.name,
                'quantity': float(item.quantity),
                'subtotal': float(item.subtotal),
                'customer_name': item.order.customer.get_full_name() or item.order.customer.username,
                'payment_method': item.order.payment_method,
                'date': str(item.order.created_at.date())
            })
        return Response(data)


class ExportTransactionsView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Transacciones"
        ws.append(['ID', 'Tipo', 'Categoría', 'Monto', 'Descripción', 'Referencia', 'Fecha'])
        for t in Transaction.objects.all().order_by('-date'):
            ws.append([t.id, t.transaction_type, t.category, float(t.amount),
                       t.description, t.reference_id, str(t.date)])
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="finanzas.xlsx"'
        wb.save(response)
        return response

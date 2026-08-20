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

        payment_filter = request.query_params.get('payment_status', 'pagado')
        qs_orders = Order.objects.filter(created_at__date__gte=start)
        if payment_filter == 'pagado':
            qs_orders = qs_orders.filter(payment_status='pagado')
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
        payment_filter = request.query_params.get('payment_status', 'pagado')
        
        qs = OrderItem.objects.select_related('order', 'order__customer', 'product').order_by('-order__created_at')
        if payment_filter == 'pagado':
            qs = qs.filter(order__payment_status='pagado')
        
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


class FinanceStatsView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        from orders.models import OrderItem
        period = request.query_params.get('period', 'month')
        payment_filter = request.query_params.get('payment_status', 'pagado')
        
        qs = OrderItem.objects.all()
        if payment_filter == 'pagado':
            qs = qs.filter(order__payment_status='pagado')
        
        if period != 'all':
            today = datetime.date.today()
            if period == 'day':
                start = today
            elif period == 'week':
                start = today - datetime.timedelta(days=7)
            elif period == 'year':
                start = today.replace(month=1, day=1)
            else: # month
                start = today.replace(day=1)
            qs = qs.filter(order__created_at__date__gte=start)
            
        stats = list(
            qs.values('product__name')
            .annotate(
                total_quantity=Sum('quantity'),
                total_revenue=Sum('subtotal'),
                total_profit=Sum('margin')
            )
            .order_by('-total_profit')
        )
        
        # Calculate summary metrics
        total_revenue = sum(float(item['total_revenue'] or 0) for item in stats)
        total_profit = sum(float(item['total_profit'] or 0) for item in stats)
        total_quantity = sum(float(item['total_quantity'] or 0) for item in stats)
        
        return Response({
            'period': period,
            'summary': {
                'total_revenue': total_revenue,
                'total_profit': total_profit,
                'total_quantity': total_quantity,
                'avg_margin_pct': (total_profit / total_revenue * 100) if total_revenue > 0 else 0
            },
            'product_stats': stats
        })

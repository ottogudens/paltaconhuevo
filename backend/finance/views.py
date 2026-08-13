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
        qs = Transaction.objects.filter(date__gte=start)
        ingresos = float(qs.filter(transaction_type='ingreso').aggregate(t=Sum('amount'))['t'] or 0)
        egresos = float(qs.filter(transaction_type='egreso').aggregate(t=Sum('amount'))['t'] or 0)
        return Response({
            'ingresos': ingresos,
            'egresos': egresos,
            'balance': ingresos - egresos,
            'period': period,
        })


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

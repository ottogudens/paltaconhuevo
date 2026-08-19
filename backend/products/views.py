from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from django.http import HttpResponse
import openpyxl
from .models import Product, Purchase
from .serializers import ProductSerializer, PurchaseSerializer
from core.permissions import IsAdminOrVendedor


class ProductListCreateView(generics.ListCreateAPIView):
    """
    GET: lectura pública para clientes autenticados y el agente WhatsApp.
    POST (crear producto): solo staff.
    """
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True).order_by('name')

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdminOrVendedor()]
        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if 'components' in request.data and isinstance(request.data['components'], str):
            import json
            try:
                request.data._mutable = True
                request.data['components'] = json.loads(request.data['components'])
                request.data._mutable = False
            except Exception:
                pass
        return super().create(request, *args, **kwargs)


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Modificar/eliminar productos: solo staff."""
    serializer_class = ProductSerializer
    queryset = Product.objects.all()
    permission_classes = [IsAdminOrVendedor]

    def update(self, request, *args, **kwargs):
        if 'components' in request.data and isinstance(request.data['components'], str):
            import json
            try:
                request.data._mutable = True
                request.data['components'] = json.loads(request.data['components'])
                request.data._mutable = False
            except Exception:
                pass
        return super().update(request, *args, **kwargs)


class PurchaseListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.all().order_by('-purchase_date')
    permission_classes = [IsAdminOrVendedor]


class PurchaseDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.all()
    permission_classes = [IsAdminOrVendedor]


class ExportPurchasesView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Compras"
        ws.append(['ID', 'Proveedor', 'Producto', 'Cantidad', 'Costo unitario', 'Costo total', 'Fecha'])
        for p in Purchase.objects.all().order_by('-purchase_date'):
            ws.append([p.id, p.supplier_name, p.product.name, float(p.quantity),
                       float(p.unit_cost), float(p.total_cost), str(p.purchase_date)])
        response = HttpResponse(
            content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        response['Content-Disposition'] = 'attachment; filename="compras.xlsx"'
        wb.save(response)
        return response


class LowStockView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def get(self, request):
        products = Product.objects.filter(is_active=True)
        low = [ProductSerializer(p).data for p in products if p.stock <= p.min_stock]
        return Response(low)

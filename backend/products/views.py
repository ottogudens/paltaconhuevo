from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.http import HttpResponse
import openpyxl
from .models import Product, Purchase
from .serializers import ProductSerializer, PurchaseSerializer

class ProductListCreateView(generics.ListCreateAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.filter(is_active=True).order_by('name')

class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProductSerializer
    queryset = Product.objects.all()

class PurchaseListCreateView(generics.ListCreateAPIView):
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.all().order_by('-purchase_date')

class PurchaseDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = PurchaseSerializer
    queryset = Purchase.objects.all()

class ExportPurchasesView(APIView):
    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Compras"
        ws.append(['ID','Proveedor','Producto','Cantidad','Costo unitario','Costo total','Fecha'])
        for p in Purchase.objects.all().order_by('-purchase_date'):
            ws.append([p.id, p.supplier_name, p.product.name, float(p.quantity), float(p.unit_cost), float(p.total_cost), str(p.purchase_date)])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="compras.xlsx"'
        wb.save(response)
        return response

class LowStockView(APIView):
    def get(self, request):
        products = Product.objects.filter(is_active=True)
        low = [ProductSerializer(p).data for p in products if p.stock <= p.min_stock]
        return Response(low)

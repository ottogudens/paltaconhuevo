from django.urls import path
from . import views

urlpatterns = [
    path('', views.ProductListCreateView.as_view()),
    path('<int:pk>/', views.ProductDetailView.as_view()),
    path('purchases/', views.PurchaseListCreateView.as_view()),
    path('purchases/<int:pk>/', views.PurchaseDetailView.as_view()),
    path('purchases/export/', views.ExportPurchasesView.as_view()),
    path('low-stock/', views.LowStockView.as_view()),
]

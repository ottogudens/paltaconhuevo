from django.urls import path
from . import views

urlpatterns = [
    path('', views.OrderListCreateView.as_view()),
    path('<int:pk>/', views.OrderDetailView.as_view()),
    path('<int:pk>/mercadopago/', views.GenerateMercadoPagoView.as_view()),
    path('webhook/mercadopago/', views.MercadoPagoWebhookView.as_view()),
    path('export/', views.ExportOrdersView.as_view()),
    path('dashboard/', views.DashboardView.as_view()),
    path('<int:pk>/payments/', views.OrderPaymentCreateView.as_view()),
    path('<int:pk>/items/<int:item_id>/', views.OrderItemUpdateView.as_view()),
]

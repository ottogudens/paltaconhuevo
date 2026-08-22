from django.urls import path
from . import views

urlpatterns = [
    path('', views.TransactionListCreateView.as_view()),
    path('<int:pk>/', views.TransactionDetailView.as_view()),
    path('summary/', views.FinanceSummaryView.as_view()),
    path('export/', views.ExportTransactionsView.as_view()),
    path('sales/', views.FinanceSalesView.as_view()),
    path('stats/', views.FinanceStatsView.as_view()),
    path('company/', views.CompanySettingsView.as_view()),
    path('backup/', views.DatabaseBackupView.as_view()),
]

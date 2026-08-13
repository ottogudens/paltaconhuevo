from django.urls import path
from . import views

urlpatterns = [
    # --- Auth público ---
    path('register/', views.RegisterView.as_view()),
    path('login/', views.LoginView.as_view()),
    path('logout/', views.LogoutView.as_view()),

    # --- Agente WhatsApp (protegido con WHATSAPP_SERVICE_TOKEN) ---
    path('whatsapp/', views.WhatsAppAuthView.as_view()),

    # --- Reset de contraseña en dos pasos (C3) ---
    path('password-reset/request/', views.PasswordResetRequestView.as_view()),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view()),

    # --- Perfil propio ---
    path('profile/', views.ProfileView.as_view()),

    # --- Clientes (admin + vendedor) ---
    path('customers/', views.CustomerListView.as_view()),
    path('customers/export/', views.ExportCustomersView.as_view()),
    path('customers/import/', views.ImportCustomersView.as_view()),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view()),

    # --- Usuarios del sistema (solo admin) ---
    path('users/', views.SystemUserListView.as_view()),
    path('users/<int:pk>/', views.SystemUserDetailView.as_view()),
]

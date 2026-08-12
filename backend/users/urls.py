from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view()),
    path('login/', views.LoginView.as_view()),
    path('logout/', views.LogoutView.as_view()),
    path('profile/', views.ProfileView.as_view()),
    path('customers/', views.CustomerListView.as_view()),
    path('customers/<int:pk>/', views.CustomerDetailView.as_view()),
    path('customers/export/', views.ExportCustomersView.as_view()),
    path('customers/import/', views.ImportCustomersView.as_view()),
    path('users/', views.SystemUserListView.as_view()),
    path('users/<int:pk>/', views.SystemUserDetailView.as_view()),
]

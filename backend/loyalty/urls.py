from django.urls import path
from . import views

urlpatterns = [
    path('my/', views.MyLoyaltyView.as_view()),
    path('all/', views.LoyaltyListView.as_view()),
    path('contests/<int:pk>/join/', views.JoinContestView.as_view()),
]

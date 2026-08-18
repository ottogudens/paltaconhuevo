from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'admin-rewards', views.RewardViewSet, basename='admin-reward')
router.register(r'admin-redemptions', views.RewardRedemptionViewSet, basename='admin-redemption')

urlpatterns = [
    path('', include(router.urls)),
    path('my/', views.MyLoyaltyView.as_view()),
    path('all/', views.LoyaltyListView.as_view()),
    path('contests/<int:pk>/join/', views.JoinContestView.as_view()),
    path('rewards/', views.ClientRewardListView.as_view()),
    path('rewards/<int:pk>/redeem/', views.RedeemRewardView.as_view()),
]

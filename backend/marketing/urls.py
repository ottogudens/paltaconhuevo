from django.urls import path
from . import views

urlpatterns = [
    path('campaigns/', views.CampaignListCreateView.as_view()),
    path('campaigns/<int:pk>/', views.CampaignDetailView.as_view()),
    path('campaigns/<int:pk>/send/', views.SendCampaignView.as_view()),
    path('campaigns/ai-generate/', views.AiGenerateCampaignView.as_view()),
    path('offers/', views.OfferListCreateView.as_view()),
    path('offers/<int:pk>/', views.OfferDetailView.as_view()),
    path('offers/<int:pk>/send/', views.SendOfferView.as_view()),
    path('contests/', views.ContestListCreateView.as_view()),
    path('contests/<int:pk>/', views.ContestDetailView.as_view()),
    path('contests/<int:pk>/draw/', views.DrawContestView.as_view()),
    path('ai-analysis/', views.AiAnalysisView.as_view()),
    path('agent-config/', views.AgentConfigView.as_view()),
]

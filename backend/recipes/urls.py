from django.urls import path
from . import views

urlpatterns = [
    path('', views.RecipeListView.as_view()),
    path('ai-generate/', views.AiGenerateRecipeView.as_view()),
    path('<slug:slug>/', views.RecipeDetailView.as_view()),
    path('<slug:slug>/like/', views.RecipeLikeView.as_view()),
    path('<slug:slug>/save/', views.RecipeSaveView.as_view()),
    path('<slug:slug>/comments/', views.RecipeCommentView.as_view()),
]

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from django.conf import settings
from django.utils.text import slugify
import anthropic, uuid
from .models import Recipe, RecipeComment
from .serializers import RecipeSerializer, RecipeCommentSerializer

class RecipeListView(generics.ListAPIView):
    serializer_class = RecipeSerializer
    permission_classes = [AllowAny]
    def get_queryset(self):
        qs = Recipe.objects.filter(is_published=True).order_by('-created_at')
        cat = self.request.query_params.get('category')
        meal = self.request.query_params.get('meal_type')
        diff = self.request.query_params.get('difficulty')
        if cat: qs = qs.filter(category=cat)
        if meal: qs = qs.filter(meal_type=meal)
        if diff: qs = qs.filter(difficulty=diff)
        return qs

class RecipeDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RecipeSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    queryset = Recipe.objects.all()
    lookup_field = 'slug'
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.views_count += 1
        instance.save(update_fields=['views_count'])
        return Response(self.get_serializer(instance, context={'request': request}).data)

class AiGenerateRecipeView(APIView):
    def post(self, request):
        ingredient = request.data.get('ingredient', 'ambos')
        meal_type = request.data.get('meal_type', 'almuerzo')
        difficulty = request.data.get('difficulty', 'facil')
        servings = request.data.get('servings', 2)
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = f"""Eres un chef nutricionista chileno. Crea una receta innovadora con {"palta y huevo" if ingredient == "ambos" else ingredient}.
Tipo de comida: {meal_type}, Dificultad: {difficulty}, Porciones: {servings}.
Responde SOLO en JSON con esta estructura exacta:
{{"title":"nombre creativo","description":"descripción atractiva","ingredients":[{{"item":"ingrediente","amount":"cantidad"}}],"steps":["paso 1","paso 2"],"tips":"consejos","calories":250,"proteins_g":15,"fats_g":18,"carbs_g":8,"fiber_g":3,"vitamins_info":"vitaminas destacadas","health_benefits":"beneficios para la salud","meta_description":"descripción SEO corta"}}"""
        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=1000, messages=[{"role":"user","content":prompt}])
        import json
        try:
            data = json.loads(msg.content[0].text)
            slug_base = slugify(data['title'])
            slug = f"{slug_base}-{str(uuid.uuid4())[:4]}"
            recipe = Recipe.objects.create(
                title=data['title'], slug=slug,
                description=data.get('description',''),
                category=ingredient, meal_type=meal_type,
                difficulty=difficulty, servings=servings,
                ingredients=data.get('ingredients',[]),
                steps=data.get('steps',[]),
                tips=data.get('tips',''),
                calories=data.get('calories',0), proteins_g=data.get('proteins_g',0),
                fats_g=data.get('fats_g',0), carbs_g=data.get('carbs_g',0),
                fiber_g=data.get('fiber_g',0),
                vitamins_info=data.get('vitamins_info',''),
                health_benefits=data.get('health_benefits',''),
                meta_description=data.get('meta_description',''),
                ai_generated=True
            )
            return Response(RecipeSerializer(recipe, context={'request':request}).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({'error': str(e), 'raw': msg.content[0].text}, status=400)

class RecipeLikeView(APIView):
    def post(self, request, slug):
        recipe = Recipe.objects.get(slug=slug)
        if recipe.likes.filter(id=request.user.id).exists():
            recipe.likes.remove(request.user)
            return Response({'liked': False})
        recipe.likes.add(request.user)
        return Response({'liked': True})

class RecipeSaveView(APIView):
    def post(self, request, slug):
        recipe = Recipe.objects.get(slug=slug)
        if recipe.saved_by.filter(id=request.user.id).exists():
            recipe.saved_by.remove(request.user)
            return Response({'saved': False})
        recipe.saved_by.add(request.user)
        return Response({'saved': True})

class RecipeCommentView(generics.ListCreateAPIView):
    serializer_class = RecipeCommentSerializer
    def get_queryset(self):
        return RecipeComment.objects.filter(recipe__slug=self.kwargs['slug'])
    def perform_create(self, serializer):
        recipe = Recipe.objects.get(slug=self.kwargs['slug'])
        serializer.save(user=self.request.user, recipe=recipe)

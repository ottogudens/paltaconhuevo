from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticatedOrReadOnly
from django.conf import settings
from django.utils.text import slugify
import uuid
from .models import Recipe, RecipeComment
from .serializers import RecipeSerializer, RecipeCommentSerializer

class RecipeListView(generics.ListCreateAPIView):
    serializer_class = RecipeSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        qs = Recipe.objects.all().order_by('-created_at')
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
        prompt = f"""Eres un chef nutricionista experimentado. Crea una receta innovadora, paso a paso, con {"palta y/o huevo" if ingredient == "ambos" else ingredient}.
Tipo: {meal_type}, Dificultad: {difficulty}, Porciones: {servings}.
Responde SOLO con un objeto JSON (sin markdown) con esta estructura exacta:
{{"title":"nombre corto y creativo","description":"descripción atractiva","ingredients":[{{"item":"ingrediente 1","amount":"cantidad"}}],"steps":["paso 1","paso 2"],"tips":"un buen consejo","calories":250,"proteins_g":15,"fats_g":18,"carbs_g":8,"fiber_g":3,"vitamins_info":"vitaminas","health_benefits":"beneficios","meta_description":"SEO"}}"""
        import json
        import traceback
        
        provider = request.data.get('provider', 'anthropic')

        try:
            raw_text = ""
            if provider == 'openai':
                if not settings.OPENAI_API_KEY:
                    return Response({'error': 'La clave de API de OpenAI (OPENAI_API_KEY) no está configurada.'}, status=400)
                import openai
                client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"}
                )
                raw_text = completion.choices[0].message.content
                
            elif provider == 'gemini':
                if not settings.GEMINI_API_KEY:
                    return Response({'error': 'La clave de API de Gemini (GEMINI_API_KEY) no está configurada.'}, status=400)
                import google.generativeai as genai
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"response_mime_type": "application/json"})
                response = model.generate_content(prompt)
                raw_text = response.text
                
            else:
                # Default a anthropic
                if not settings.ANTHROPIC_API_KEY:
                    return Response({'error': 'La clave de API de Anthropic (ANTHROPIC_API_KEY) no está configurada.'}, status=400)
                import anthropic
                client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                msg = client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=1500,
                    messages=[{"role":"user","content":prompt}]
                )
                raw_text = msg.content[0].text

            data = json.loads(raw_text)
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
            err_msg = str(e)
            raw = locals().get('raw_text', 'No generado')
            return Response({'error': err_msg, 'raw': raw}, status=400)

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

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
        prompt = f"""Eres un chef nutricionista experimentado para 'Palta con Huevo'. Crea una receta completa y estructurada con {"palta y/o huevo" if ingredient == "ambos" else ingredient}.
Tipo: {meal_type}, Dificultad: {difficulty}, Porciones: {servings}.
Asegúrate de que la receta incluya una introducción apetitosa, la lista detallada de ingredientes con sus cantidades exactas, y la preparación explicada paso a paso de forma limpia y profesional.
Responde SOLO con un objeto JSON (sin markdown) con esta estructura exacta:
{{"title":"Nombre de la receta","description":"Introducción apetitosa y atractiva sobre el plato","ingredients":[{{"item":"ingrediente 1","amount":"cantidad completa"}},{{"item":"ingrediente 2","amount":"cantidad completa"}}],"steps":["Paso 1: Instrucción detallada","Paso 2: Instrucción detallada","Paso 3: Instrucción detallada"],"tips":"Un consejo práctico del chef","calories":350,"proteins_g":20,"fats_g":22,"carbs_g":10,"fiber_g":5,"vitamins_info":"Rica en Vitamina E, K y Complejo B","health_benefits":"Aporta grasas saludables y proteína de alto valor biológico","meta_description":"Receta nutritiva y fácil de palta y huevo"}}"""
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
                model = genai.GenerativeModel('gemini-3.6-flash', generation_config={"response_mime_type": "application/json"})
                response = model.generate_content(prompt)
                raw_text = response.text
                
            else:
                # Default a anthropic
                if not settings.ANTHROPIC_API_KEY:
                    return Response({'error': 'La clave de API de Anthropic (ANTHROPIC_API_KEY) no está configurada.'}, status=400)
                import anthropic
                client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
                msg = client.messages.create(
                    model="claude-3-5-sonnet-20240620",
                    max_tokens=1500,
                    messages=[{"role":"user","content":prompt}]
                )
                raw_text = msg.content[0].text

            import re
            match = re.search(r'\{.*\}', raw_text, re.DOTALL)
            if match:
                cleaned_text = match.group(0)
            else:
                cleaned_text = raw_text

            data = json.loads(cleaned_text)
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

            # Generate image automatically using Pollinations AI
            import requests
            import urllib.parse
            from django.core.files.base import ContentFile
            import logging
            
            try:
                # Usa un modelo visual de comida para asegurar mejores resultados
                image_prompt = f"delicious gourmet food photography of {data['title']}, appetizing, professional 8k photography, top down view"
                safe_prompt = urllib.parse.quote(image_prompt)
                img_url = f"https://image.pollinations.ai/prompt/{safe_prompt}?width=1024&height=1024&nologo=true&seed=42"
                headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36"}
                
                # Desactivamos proxies o forzamos IPv4 si Railway bloquea a Pollinations
                img_response = requests.get(img_url, headers=headers, timeout=20)
                if img_response.status_code == 200 and len(img_response.content) > 1000:
                    recipe.image.save(f"{slug}.jpg", ContentFile(img_response.content), save=True)
                else:
                    logging.getLogger(__name__).warning("Pollinations respondió sin error HTTP pero con poco contenido.")
            except Exception as img_err:
                logging.getLogger(__name__).warning("No se pudo generar la imagen con Pollinations: %s", img_err)

            return Response(RecipeSerializer(recipe, context={'request':request}).data, status=status.HTTP_201_CREATED)
        except Exception as e:
            import logging
            logging.getLogger(__name__).exception("Recipe error: %s", e)
            error_str = str(e).lower()
            if 'credit balance' in error_str or 'insufficient_quota' in error_str:
                err_msg = 'No tienes saldo suficiente en este proveedor de IA. Recarga créditos para continuar.'
            elif '404' in error_str or 'not found' in error_str or 'no longer available' in error_str:
                err_msg = 'El modelo de IA solicitado no está disponible o fue descontinuado por el proveedor.'
            else:
                err_msg = f'Error de conexión con IA: {str(e)}'
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

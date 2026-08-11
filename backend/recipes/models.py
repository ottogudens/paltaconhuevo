from django.db import models
from django.conf import settings

class Recipe(models.Model):
    CATEGORY_CHOICES = [('palta','Solo Palta'),('huevo','Solo Huevo'),('ambos','Palta + Huevo'),('proteina','Alta Proteína'),('fit','Fit y Saludable'),('familiar','Familiar'),('especial','Ocasiones Especiales')]
    DIFFICULTY_CHOICES = [('facil','Fácil'),('media','Media'),('avanzada','Avanzada')]
    MEAL_CHOICES = [('desayuno','Desayuno'),('entrada','Entrada'),('almuerzo','Almuerzo'),('cena','Cena'),('snack','Snack'),('postre','Postre')]

    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=220)
    description = models.TextField()
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    meal_type = models.CharField(max_length=20, choices=MEAL_CHOICES)
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES, default='facil')
    prep_time_minutes = models.IntegerField(default=15)
    cook_time_minutes = models.IntegerField(default=20)
    servings = models.IntegerField(default=2)
    ingredients = models.JSONField(default=list)
    steps = models.JSONField(default=list)
    tips = models.TextField(blank=True)
    # Nutrition
    calories = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    proteins_g = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    fats_g = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    carbs_g = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    fiber_g = models.DecimalField(max_digits=8, decimal_places=1, default=0)
    vitamins_info = models.TextField(blank=True)
    health_benefits = models.TextField(blank=True)
    image = models.ImageField(upload_to='recipes/', null=True, blank=True)
    is_published = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    ai_generated = models.BooleanField(default=False)
    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_recipes', blank=True)
    saved_by = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='saved_recipes', blank=True)
    meta_title = models.CharField(max_length=200, blank=True)
    meta_description = models.CharField(max_length=300, blank=True)
    views_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title

class RecipeComment(models.Model):
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comentario de {self.user} en {self.recipe}"

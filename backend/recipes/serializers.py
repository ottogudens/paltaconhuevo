from rest_framework import serializers
from .models import Recipe, RecipeComment

class RecipeCommentSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    class Meta:
        model = RecipeComment
        fields = '__all__'

class RecipeSerializer(serializers.ModelSerializer):
    comments = RecipeCommentSerializer(many=True, read_only=True)
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()

    def get_likes_count(self, obj):
        return obj.likes.count()
    def get_is_liked(self, obj):
        req = self.context.get('request')
        return req and req.user.is_authenticated and obj.likes.filter(id=req.user.id).exists()
    def get_is_saved(self, obj):
        req = self.context.get('request')
        return req and req.user.is_authenticated and obj.saved_by.filter(id=req.user.id).exists()

    class Meta:
        model = Recipe
        fields = '__all__'

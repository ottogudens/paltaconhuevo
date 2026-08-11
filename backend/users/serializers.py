from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','email','first_name','last_name','role','phone','address','commune','birth_date','preferred_payment_method','preferred_payment_condition','whatsapp_number','email_notifications','whatsapp_notifications','avatar','social_location','social_interests','created_at']
        read_only_fields = ['id','created_at']

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    class Meta:
        model = User
        fields = ['username','email','password','first_name','last_name','phone','whatsapp_number','address','commune']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data, role='cliente')
        from loyalty.models import LoyaltyAccount
        LoyaltyAccount.objects.create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(**data)
        if not user:
            raise serializers.ValidationError('Credenciales inválidas')
        return {'user': user}

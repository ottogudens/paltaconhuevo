from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','email','first_name','last_name','role','phone','address','commune','birth_date','preferred_payment_method','preferred_payment_condition','whatsapp_number','email_notifications','whatsapp_notifications','avatar','social_location','social_interests','created_at']
        read_only_fields = ['id','created_at']

class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'address', 'commune', 'whatsapp_number']

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'paltaconhuevo2024'
        email = validated_data.get('email', '')
        username = validated_data.get('username', '')
        if not username:
            if email:
                username = email.split('@')[0]
            else:
                import uuid
                username = f"user_{uuid.uuid4().hex[:8]}"
            validated_data['username'] = username

        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == 'cliente':
            from loyalty.models import LoyaltyAccount
            LoyaltyAccount.objects.get_or_create(user=user)
        return user

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
        identifier = data.get('username', '').strip()
        password = data.get('password', '')

        # Intentar buscar el usuario por username, email o teléfono
        user_qs = User.objects.none()

        if '@' in identifier:
            user_qs = User.objects.filter(email__iexact=identifier)
        else:
            # Limpiar teléfono
            clean_digits = ''.join(filter(str.isdigit, identifier))
            phone_variants = [identifier]
            if clean_digits:
                phone_variants.append(clean_digits)
                if len(clean_digits) == 9:
                    phone_variants.append(f"+56{clean_digits}")
                    phone_variants.append(f"56{clean_digits}")
                elif len(clean_digits) == 11 and clean_digits.startswith('569'):
                    phone_variants.append(clean_digits[2:]) # 984205124
                    phone_variants.append(f"+{clean_digits}")

            from django.db.models import Q
            user_qs = User.objects.filter(
                Q(username__iexact=identifier) |
                Q(email__iexact=identifier) |
                Q(phone__in=phone_variants) |
                Q(whatsapp_number__in=phone_variants)
            )

        user = None
        for u in user_qs:
            if u.check_password(password):
                user = u
                break

        if not user:
            # Intento estándar por authenticate como fallback
            user = authenticate(username=identifier, password=password)

        if not user:
            raise serializers.ValidationError('Credenciales inválidas')
        return {'user': user}

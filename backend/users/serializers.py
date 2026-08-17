from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id','username','email','first_name','last_name','role','phone','address','commune','birth_date','preferred_payment_method','preferred_payment_condition','whatsapp_number','email_notifications','whatsapp_notifications','avatar','social_location','social_interests','created_at']
        read_only_fields = ['id', 'username', 'role', 'created_at']

class CreateUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=4, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['id', 'email', 'password', 'first_name', 'last_name', 'role', 'phone', 'address', 'commune', 'whatsapp_number']

    def create(self, validated_data):
        password = validated_data.pop('password', None) or 'paltaconhuevo2024'
        email = validated_data.get('email', '')
        phone = validated_data.get('phone', '')
        import uuid
        if email:
            base = email.split('@')[0]
        elif phone:
            base = ''.join(filter(str.isdigit, phone))
        else:
            base = 'user'
        username = f"{base}_{uuid.uuid4().hex[:6]}"
        validated_data['username'] = username

        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        if user.role == 'cliente':
            from loyalty.models import LoyaltyAccount
            LoyaltyAccount.objects.get_or_create(user=user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    class Meta:
        model = User
        fields = ['email','password','first_name','last_name','phone','whatsapp_number','address','commune']

    def create(self, validated_data):
        email = validated_data.get('email', '')
        phone = validated_data.get('phone', '')
        import uuid
        if email:
            base = email.split('@')[0]
        elif phone:
            base = ''.join(filter(str.isdigit, phone))
        else:
            base = 'user'
        validated_data['username'] = f"{base}_{uuid.uuid4().hex[:6]}"

        user = User.objects.create_user(**validated_data, role='cliente')
        from loyalty.models import LoyaltyAccount
        LoyaltyAccount.objects.get_or_create(user=user)
        return user

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()

    def validate(self, data):
        identifier = data.get('username', '').strip()
        password = data.get('password', '')

        # Limpiar teléfono por si es una búsqueda telefónica
        clean_digits = ''.join(filter(str.isdigit, identifier))
        phone_variants = [identifier]
        if clean_digits:
            phone_variants.append(clean_digits)
            if len(clean_digits) == 9:
                phone_variants.append(f"+56{clean_digits}")
                phone_variants.append(f"56{clean_digits}")
            elif len(clean_digits) == 11 and clean_digits.startswith('569'):
                phone_variants.append(clean_digits[2:])
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
            # Intento estándar por authenticate de Django como fallback
            user = authenticate(username=identifier, password=password)

        if not user:
            raise serializers.ValidationError('Credenciales inválidas')
        return {'user': user}

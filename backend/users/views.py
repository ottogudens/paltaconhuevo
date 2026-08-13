from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.http import HttpResponse
import openpyxl
from .models import User
from .serializers import UserSerializer, RegisterSerializer, LoginSerializer

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})

class WhatsAppAuthView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        phone = str(request.data.get('phone', '')).strip()
        name = str(request.data.get('name', '')).strip()

        if not phone:
            return Response({'error': 'El teléfono es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        clean_digits = ''.join(filter(str.isdigit, phone))
        phone_variants = [phone]
        if clean_digits:
            phone_variants.append(clean_digits)
            if len(clean_digits) == 9:
                phone_variants.append(f"+56{clean_digits}")
                phone_variants.append(f"56{clean_digits}")
            elif len(clean_digits) == 11 and clean_digits.startswith('569'):
                phone_variants.append(clean_digits[2:])
                phone_variants.append(f"+{clean_digits}")

        from django.db.models import Q
        user = User.objects.filter(
            Q(phone__in=phone_variants) |
            Q(whatsapp_number__in=phone_variants) |
            Q(username__in=phone_variants)
        ).first()

        if user:
            if name and (not user.first_name or user.first_name.startswith('569') or user.first_name == 'wa'):
                parts = name.split(' ')
                user.first_name = parts[0]
                user.last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
                user.save()
            token, _ = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data,
                'is_new': False
            })

        if not name:
            return Response({
                'name_required': True,
                'message': 'Se requiere el nombre del usuario para el registro'
            }, status=status.HTTP_200_OK)

        parts = name.split(' ')
        first_name = parts[0]
        last_name = ' '.join(parts[1:]) if len(parts) > 1 else ''
        username = f"wa_{clean_digits or phone}"
        
        if User.objects.filter(username=username).exists():
            import uuid
            username = f"{username}_{uuid.uuid4().hex[:4]}"

        user = User.objects.create_user(
            username=username,
            email=f"{clean_digits or phone}@whatsapp.cl",
            first_name=first_name,
            last_name=last_name,
            phone=phone,
            whatsapp_number=phone,
            role='cliente'
        )
        user.set_password(phone)
        user.save()

        from loyalty.models import LoyaltyAccount
        LoyaltyAccount.objects.get_or_create(user=user)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'is_new': True
        }, status=status.HTTP_201_CREATED)


class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        return Response({'message': 'Sesión cerrada'})

class PasswordResetView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        identifier = (request.data.get('identifier') or '').strip()
        new_password = (request.data.get('new_password') or '').strip()

        if not identifier or not new_password:
            return Response({'error': 'Debes proporcionar tu correo/teléfono y la nueva contraseña'}, status=400)

        if len(new_password) < 4:
            return Response({'error': 'La contraseña debe tener al menos 4 caracteres'}, status=400)

        clean_digits = ''.join(filter(str.isdigit, identifier))
        phone_variants = [identifier]
        if clean_digits:
            phone_variants.append(clean_digits)
            if len(clean_digits) == 9:
                phone_variants.append(f"+56{clean_digits}")
            elif len(clean_digits) == 11 and clean_digits.startswith('569'):
                phone_variants.append(clean_digits[2:])
                phone_variants.append(f"+{clean_digits}")

        from django.db.models import Q
        user = User.objects.filter(
            Q(email__iexact=identifier) |
            Q(username__iexact=identifier) |
            Q(phone__in=phone_variants) |
            Q(whatsapp_number__in=phone_variants)
        ).first()

        if not user:
            return Response({'error': 'No se encontró ninguna cuenta asociada a este correo o teléfono'}, status=404)

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Contraseña restablecida con éxito. Ya puedes iniciar sesión con tu nueva clave.'})

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

from .serializers import UserSerializer, RegisterSerializer, LoginSerializer, CreateUserSerializer

class CustomerListView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateUserSerializer
        return UserSerializer

    def get_queryset(self):
        return User.objects.filter(role='cliente').order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(role='cliente')

class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(role='cliente')
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CreateUserSerializer
        return UserSerializer

class SystemUserListView(generics.ListCreateAPIView):
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CreateUserSerializer
        return UserSerializer

    def get_queryset(self):
        qs = User.objects.filter(role__in=['admin', 'vendedor']).order_by('-created_at')
        role = self.request.query_params.get('role')
        if role and role in ['admin', 'vendedor']:
            qs = qs.filter(role=role)
        return qs

class SystemUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(role__in=['admin', 'vendedor'])
    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return CreateUserSerializer
        return UserSerializer

class ExportCustomersView(APIView):
    def get(self, request):
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Clientes"
        headers = ['ID','Nombre','Email','Teléfono','WhatsApp','Dirección','Comuna','Método de pago','Condición pago','Fecha registro']
        ws.append(headers)
        for u in User.objects.filter(role='cliente'):
            ws.append([u.id, u.get_full_name(), u.email, u.phone, u.whatsapp_number, u.address, u.commune, u.preferred_payment_method, u.preferred_payment_condition, str(u.created_at.date())])
        response = HttpResponse(content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="clientes.xlsx"'
        wb.save(response)
        return response

class ImportCustomersView(APIView):
    def post(self, request):
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'No se recibió archivo'}, status=400)
        wb = openpyxl.load_workbook(file)
        ws = wb.active
        created = 0
        errors = []
        for i, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            try:
                name_parts = (row[0] or '').split(' ', 1)
                email = row[1] or ''
                phone = str(row[2] or '')
                if not email:
                    continue
                user, c = User.objects.get_or_create(email=email, defaults={
                    'username': email.split('@')[0],
                    'first_name': name_parts[0],
                    'last_name': name_parts[1] if len(name_parts) > 1 else '',
                    'phone': phone,
                    'role': 'cliente',
                })
                if c:
                    user.set_password('paltaconhuevo2024')
                    user.save()
                    from loyalty.models import LoyaltyAccount
                    LoyaltyAccount.objects.get_or_create(user=user)
                    created += 1
            except Exception as e:
                errors.append(f"Fila {i}: {str(e)}")
        return Response({'created': created, 'errors': errors})

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

class LogoutView(APIView):
    def post(self, request):
        request.user.auth_token.delete()
        return Response({'message': 'Sesión cerrada'})

class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    def get_object(self):
        return self.request.user

class CustomerListView(generics.ListAPIView):
    serializer_class = UserSerializer
    def get_queryset(self):
        return User.objects.filter(role='cliente').order_by('-created_at')

class CustomerDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    queryset = User.objects.filter(role='cliente')

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

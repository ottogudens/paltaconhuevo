from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import LoyaltyAccount, PointTransaction, ContestParticipant, Reward, RewardRedemption
from .serializers import LoyaltyAccountSerializer, PointTransactionSerializer, RewardSerializer, RewardRedemptionSerializer
from marketing.models import Contest
from core.permissions import IsAdminOrVendedor
from rest_framework import viewsets, status
import random
import string


class MyLoyaltyView(APIView):
    """Cada cliente ve solo su propia cuenta de fidelidad."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        acc, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        return Response(LoyaltyAccountSerializer(acc).data)


class LoyaltyListView(generics.ListAPIView):
    """Lista completa de cuentas de fidelidad: solo staff."""
    serializer_class = LoyaltyAccountSerializer
    queryset = LoyaltyAccount.objects.all().order_by('-points')
    permission_classes = [IsAdminOrVendedor]


class JoinContestView(APIView):
    """Cualquier cliente autenticado puede inscribirse a un concurso."""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        contest = Contest.objects.get(pk=pk)
        acc = request.user.loyalty
        eligible = True
        if contest.min_purchase_amount > 0 and acc.total_purchases < contest.min_purchase_amount:
            eligible = False
        if contest.min_points > 0 and acc.points < contest.min_points:
            eligible = False
        if not eligible:
            return Response({'error': 'No cumples los requisitos para participar'}, status=400)
        p, created = ContestParticipant.objects.get_or_create(contest_id=pk, user=request.user)
        return Response({
            'joined': created,
            'message': '¡Inscrito con éxito!' if created else 'Ya estabas inscrito',
        })

class RewardViewSet(viewsets.ModelViewSet):
    """Admin CRUD para Premios"""
    queryset = Reward.objects.all().order_by('points_cost')
    serializer_class = RewardSerializer
    permission_classes = [IsAdminOrVendedor]

class RewardRedemptionViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin lista de canjes de premios (solo lectura, estado generado)"""
    queryset = RewardRedemption.objects.all().order_by('-created_at')
    serializer_class = RewardRedemptionSerializer
    permission_classes = [IsAdminOrVendedor]

class ClientRewardListView(generics.ListAPIView):
    """Clientes ven premios activos"""
    queryset = Reward.objects.filter(is_active=True).order_by('points_cost')
    serializer_class = RewardSerializer
    permission_classes = [IsAuthenticated]

class RedeemRewardView(APIView):
    """Cliente canjea un premio"""
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            reward = Reward.objects.get(pk=pk, is_active=True)
        except Reward.DoesNotExist:
            return Response({'error': 'Premio no encontrado o inactivo'}, status=status.HTTP_404_NOT_FOUND)

        acc, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        if acc.points < reward.points_cost:
            return Response({'error': 'Puntos insuficientes'}, status=status.HTTP_400_BAD_REQUEST)

        # Generar código único de cupón
        code = 'DESC-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        while RewardRedemption.objects.filter(coupon_code=code).exists():
            code = 'DESC-' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

        # Descontar puntos
        acc.points -= reward.points_cost
        acc.save()

        # Registrar transacción
        PointTransaction.objects.create(
            account=acc,
            transaction_type='canjeado',
            points=-reward.points_cost,
            description=f'Canje: {reward.name}',
            reference_id=code
        )

        # Crear Redemption
        redemption = RewardRedemption.objects.create(
            user=request.user,
            reward=reward,
            coupon_code=code,
            status='generado'
        )

        return Response({
            'message': 'Premio canjeado exitosamente',
            'coupon_code': code,
            'redemption': RewardRedemptionSerializer(redemption).data
        })

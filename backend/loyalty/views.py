from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import LoyaltyAccount, PointTransaction, ContestParticipant
from .serializers import LoyaltyAccountSerializer, PointTransactionSerializer
from marketing.models import Contest
from core.permissions import IsAdminOrVendedor


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

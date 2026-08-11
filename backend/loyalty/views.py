from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import LoyaltyAccount, PointTransaction, ContestParticipant
from .serializers import LoyaltyAccountSerializer, PointTransactionSerializer
from marketing.models import Contest

class MyLoyaltyView(APIView):
    def get(self, request):
        acc, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        return Response(LoyaltyAccountSerializer(acc).data)

class LoyaltyListView(generics.ListAPIView):
    serializer_class = LoyaltyAccountSerializer
    queryset = LoyaltyAccount.objects.all().order_by('-points')

class JoinContestView(APIView):
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
        return Response({'joined': created, 'message': '¡Inscrito con éxito!' if created else 'Ya estabas inscrito'})

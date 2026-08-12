from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
import anthropic, requests, random, datetime
from .models import Campaign, Contest, Offer, AgentConfig
from .serializers import CampaignSerializer, ContestSerializer, OfferSerializer, AgentConfigSerializer
from users.models import User
from loyalty.models import LoyaltyAccount, ContestParticipant

class CampaignListCreateView(generics.ListCreateAPIView):
    serializer_class = CampaignSerializer
    queryset = Campaign.objects.all().order_by('-created_at')
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class CampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CampaignSerializer
    queryset = Campaign.objects.all()

class SendCampaignView(APIView):
    def post(self, request, pk):
        campaign = Campaign.objects.get(pk=pk)
        segment = campaign.target_segment
        if segment == 'todos':
            users = User.objects.filter(role='cliente')
        elif segment in ['bronce','plata','oro','premium']:
            users = User.objects.filter(role='cliente', loyalty__level=segment)
        else:
            users = User.objects.filter(role='cliente')
        sent = 0
        for user in users:
            if campaign.channel in ['whatsapp','ambos'] and user.whatsapp_number and user.whatsapp_notifications:
                try:
                    requests.post(f"{settings.WHATSAPP_SERVICE_URL}/send", json={"to": user.whatsapp_number, "message": campaign.message}, headers={"Authorization": f"Bearer {settings.WHATSAPP_SERVICE_TOKEN}"}, timeout=5)
                    sent += 1
                except: pass
        campaign.status = 'enviada'
        campaign.sent_at = datetime.datetime.now()
        campaign.recipients_count = sent
        campaign.save()
        return Response({'sent': sent, 'status': 'enviada'})

class AiGenerateCampaignView(APIView):
    def post(self, request):
        context = request.data.get('context', '')
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=500,
            messages=[{"role":"user","content":f"Eres un experto en marketing para 'Palta con Huevo', un negocio chileno de venta de paltas y huevos. Crea un mensaje de WhatsApp/Email atractivo y corto para una campaña. Contexto: {context}. Responde SOLO con el mensaje, sin explicaciones, en español chileno."}]
        )
        return Response({'message': msg.content[0].text})

class OfferListCreateView(generics.ListCreateAPIView):
    serializer_class = OfferSerializer
    def get_queryset(self):
        return Offer.objects.filter(is_active=True).order_by('-created_at')

class OfferDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OfferSerializer
    queryset = Offer.objects.all()

class SendOfferView(APIView):
    def post(self, request, pk):
        offer = Offer.objects.get(pk=pk)
        channel = request.data.get('channel', 'whatsapp') # whatsapp, email, ambos
        users = User.objects.filter(role='cliente')

        message_text = f"🔥 *¡OFERTA IMPERDIBLE EN PALTA CON HUEVO!* 🔥\n\n*{offer.title}*\n{offer.description}\n\n🏷️ Descuento: *{offer.discount_percentage}% OFF*\n📅 Válido hasta: {offer.valid_until}\n\n¡Haz tu pedido respondiendo a este mensaje o desde nuestro sitio web! 🥑🥚"

        sent = 0
        for user in users:
            if channel in ['whatsapp', 'ambos'] and user.whatsapp_number and user.whatsapp_notifications:
                try:
                    requests.post(
                        f"{settings.WHATSAPP_SERVICE_URL}/send",
                        json={"to": user.whatsapp_number, "message": message_text},
                        headers={"Authorization": f"Bearer {settings.WHATSAPP_SERVICE_TOKEN}"},
                        timeout=5
                    )
                    sent += 1
                except: pass
        return Response({'sent': sent, 'message': 'Oferta enviada masivamente con éxito'})

class ContestListCreateView(generics.ListCreateAPIView):
    serializer_class = ContestSerializer
    queryset = Contest.objects.all().order_by('-created_at')

class ContestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContestSerializer
    queryset = Contest.objects.all()

class DrawContestView(APIView):
    def post(self, request, pk):
        contest = Contest.objects.get(pk=pk)
        participants = ContestParticipant.objects.filter(contest_id=pk)
        if not participants.exists():
            return Response({'error': 'No hay participantes'}, status=400)
        winner_participant = random.choice(list(participants))
        contest.winner_id = winner_participant.user_id
        contest.status = 'finalizado'
        contest.save()
        winner = winner_participant.user
        # Notify winner via WhatsApp
        if winner.whatsapp_number:
            try:
                requests.post(f"{settings.WHATSAPP_SERVICE_URL}/send", json={"to": winner.whatsapp_number, "message": f"🎉 ¡Felicitaciones {winner.first_name}! Ganaste el concurso '{contest.name}'. Premio: {contest.reward_description}. Te contactaremos pronto 🥑"}, headers={"Authorization": f"Bearer {settings.WHATSAPP_SERVICE_TOKEN}"}, timeout=5)
            except: pass
        return Response({'winner': winner.get_full_name(), 'email': winner.email})

class AiAnalysisView(APIView):
    def post(self, request):
        from orders.models import Order
        from django.db.models import Sum, Count
        today = datetime.date.today()
        month_start = today.replace(day=1)
        sales_data = Order.objects.filter(created_at__date__gte=month_start).aggregate(total=Sum('total'), count=Count('id'))
        analysis_type = request.data.get('type', 'general')
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = f"""Eres un analista de negocios para 'Palta con Huevo', negocio chileno de paltas y huevos.
Datos del mes actual: Ventas totales: ${sales_data['total'] or 0} CLP, Número de pedidos: {sales_data['count']}.
Tipo de análisis solicitado: {analysis_type}.
Contexto adicional: {request.data.get('context', '')}.
Proporciona análisis concreto y recomendaciones accionables en español chileno. Sé breve y específico."""
        msg = client.messages.create(model="claude-sonnet-4-6", max_tokens=800, messages=[{"role":"user","content":prompt}])
        return Response({'analysis': msg.content[0].text})

class AgentConfigView(APIView):
    def get(self, request):
        config, _ = AgentConfig.objects.get_or_create(id=1, defaults={
            'name': 'Paltín',
            'system_prompt': 'Eres el asistente virtual de "Palta con Huevo" 🥑, un negocio chileno de venta de paltas y huevos. Tu nombre es Paltín. Hablas en español chileno, eres amable, cercano y usas emojis con moderación.',
            'additional_info': 'Entregas de Lunes a Sábado. Retiro gratis en tienda.',
            'human_notification_phone': ''
        })
        return Response(AgentConfigSerializer(config).data)

    def post(self, request):
        config, _ = AgentConfig.objects.get_or_create(id=1)
        serializer = AgentConfigSerializer(config, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

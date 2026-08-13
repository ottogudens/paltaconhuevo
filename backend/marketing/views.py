from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.conf import settings
import anthropic, requests, random, datetime
from .models import Campaign, Contest, Offer, AgentConfig
from .serializers import CampaignSerializer, ContestSerializer, OfferSerializer, AgentConfigSerializer
from users.models import User
from loyalty.models import LoyaltyAccount, ContestParticipant
from core.permissions import IsAdmin, IsAdminOrVendedor, IsWhatsAppServiceOrAdminOrVendedor


class CampaignListCreateView(generics.ListCreateAPIView):
    serializer_class = CampaignSerializer
    queryset = Campaign.objects.all().order_by('-created_at')
    permission_classes = [IsAdminOrVendedor]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class CampaignDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CampaignSerializer
    queryset = Campaign.objects.all()
    permission_classes = [IsAdminOrVendedor]


class SendCampaignView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def post(self, request, pk):
        campaign = Campaign.objects.get(pk=pk)
        segment = campaign.target_segment
        if segment == 'todos':
            users = User.objects.filter(role='cliente')
        elif segment in ['bronce', 'plata', 'oro', 'premium']:
            users = User.objects.filter(role='cliente', loyalty__level=segment)
        else:
            users = User.objects.filter(role='cliente')
        sent = 0
        for user in users:
            if campaign.channel in ['whatsapp', 'ambos'] and user.whatsapp_number and user.whatsapp_notifications:
                try:
                    requests.post(
                        f"{settings.WHATSAPP_SERVICE_URL}/send",
                        json={"to": user.whatsapp_number, "message": campaign.message},
                        headers={"Authorization": f"Bearer {settings.WHATSAPP_SERVICE_TOKEN}"},
                        timeout=5,
                    )
                    sent += 1
                except Exception:
                    pass
        campaign.status = 'enviada'
        campaign.sent_at = datetime.datetime.now()
        campaign.recipients_count = sent
        campaign.save()
        return Response({'sent': sent, 'status': 'enviada'})


class AiGenerateCampaignView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def post(self, request):
        context = request.data.get('context', '')
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=500,
            messages=[{"role": "user", "content": (
                "Eres un experto en marketing para 'Palta con Huevo', un negocio chileno de venta de paltas y huevos. "
                f"Crea un mensaje de WhatsApp/Email atractivo y corto para una campaña. Contexto: {context}. "
                "Responde SOLO con el mensaje, sin explicaciones, en español chileno."
            )}],
        )
        return Response({'message': msg.content[0].text})


class OfferListCreateView(generics.ListCreateAPIView):
    serializer_class = OfferSerializer
    permission_classes = [IsAdminOrVendedor]

    def get_queryset(self):
        return Offer.objects.filter(is_active=True).order_by('-created_at')


class OfferDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = OfferSerializer
    queryset = Offer.objects.all()
    permission_classes = [IsAdminOrVendedor]


class SendOfferView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def post(self, request, pk):
        offer = Offer.objects.get(pk=pk)
        channel = request.data.get('channel', 'whatsapp')
        users = User.objects.filter(role='cliente')
        message_text = (
            f"🔥 *¡OFERTA IMPERDIBLE EN PALTA CON HUEVO!* 🔥\n\n"
            f"*{offer.title}*\n{offer.description}\n\n"
            f"🏷️ Descuento: *{offer.discount_percentage}% OFF*\n"
            f"📅 Válido hasta: {offer.valid_until}\n\n"
            "¡Haz tu pedido respondiendo a este mensaje o desde nuestro sitio web! 🥑🥚"
        )
        sent = 0
        for user in users:
            if channel in ['whatsapp', 'ambos'] and user.whatsapp_number and user.whatsapp_notifications:
                try:
                    requests.post(
                        f"{settings.WHATSAPP_SERVICE_URL}/send",
                        json={"to": user.whatsapp_number, "message": message_text},
                        headers={"Authorization": f"Bearer {settings.WHATSAPP_SERVICE_TOKEN}"},
                        timeout=5,
                    )
                    sent += 1
                except Exception:
                    pass
        return Response({'sent': sent, 'message': 'Oferta enviada masivamente con éxito'})


class ContestListCreateView(generics.ListCreateAPIView):
    serializer_class = ContestSerializer
    queryset = Contest.objects.all().order_by('-created_at')
    permission_classes = [IsAdminOrVendedor]


class ContestDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ContestSerializer
    queryset = Contest.objects.all()
    permission_classes = [IsAdminOrVendedor]


class DrawContestView(APIView):
    """Solo admin puede ejecutar un sorteo."""
    permission_classes = [IsAdmin]

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
        if winner.whatsapp_number:
            try:
                requests.post(
                    f"{settings.WHATSAPP_SERVICE_URL}/send",
                    json={"to": winner.whatsapp_number, "message": (
                        f"🎉 ¡Felicitaciones {winner.first_name}! "
                        f"Ganaste el concurso '{contest.name}'. "
                        f"Premio: {contest.reward_description}. Te contactaremos pronto 🥑"
                    )},
                    headers={"Authorization": f"Bearer {settings.WHATSAPP_SERVICE_TOKEN}"},
                    timeout=5,
                )
            except Exception:
                pass
        return Response({'winner': winner.get_full_name(), 'email': winner.email})


class AiAnalysisView(APIView):
    permission_classes = [IsAdminOrVendedor]

    def post(self, request):
        from orders.models import Order
        from django.db.models import Sum, Count
        today = datetime.date.today()
        month_start = today.replace(day=1)
        sales_data = Order.objects.filter(
            created_at__date__gte=month_start
        ).aggregate(total=Sum('total'), count=Count('id'))
        analysis_type = request.data.get('type', 'general')
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        prompt = (
            "Eres un analista de negocios para 'Palta con Huevo', negocio chileno de paltas y huevos.\n"
            f"Datos del mes actual: Ventas totales: ${sales_data['total'] or 0} CLP, "
            f"Número de pedidos: {sales_data['count']}.\n"
            f"Tipo de análisis solicitado: {analysis_type}.\n"
            f"Contexto adicional: {request.data.get('context', '')}.\n"
            "Proporciona análisis concreto y recomendaciones accionables en español chileno. Sé breve y específico."
        )
        msg = client.messages.create(
            model="claude-sonnet-4-6", max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        return Response({'analysis': msg.content[0].text})


class AgentConfigView(APIView):
    """
    GET: accesible por el agente WhatsApp (token de servicio) o staff admin/vendedor.
    POST: solo admin puede modificar el system prompt.
    """
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return [IsWhatsAppServiceOrAdminOrVendedor()]

    def get(self, request):
        default_prompt = (
            "Eres el asistente virtual oficial de 'Palta con Huevo' 🥑🥚, un emprendimiento chileno "
            "especializado en la venta de paltas y huevos de alta calidad.\n\n"
            "DIRECTRICES DE COMPORTAMIENTO Y TRATO AL CLIENTE:\n"
            "1. Tono y Trato: Sé sumamente amable, cálido, respetuoso y educado. Trata al cliente de 'tú' "
            "con cercanía, usando modismos chilenos sutiles y amigables (ej: '¡Hola!', 'con gusto', '¡listo!', '¡excelente!').\n"
            "2. Uso de Emojis: Utiliza emojis con moderación y pertinencia para darle vida y frescura a las respuestas "
            "(prioriza 🥑, 🥚, 📦, 🛒, 💳, ⭐, 👋, ✅). Evita sobrecargar el texto con emojis en cada palabra.\n"
            "3. Concisión y Claridad: Mantén tus respuestas breves (máximo 3 a 4 líneas por mensaje) para facilitar "
            "la lectura fluida en WhatsApp.\n"
            "4. Atención y Ayuda: Ofrece siempre ayuda clara para tomar pedidos, consultar precios, verificar stock, "
            "revisar puntos de fidelidad y coordinar métodos de pago o entrega.\n"
            "5. Derivación Humana: Si el cliente solicita hablar con una persona real o manifiesta una duda compleja "
            "que no puedas resolver, mantén la cortesía e indica que lo transferirás de inmediato con un ejecutivo humano."
        )
        try:
            config, _ = AgentConfig.objects.get_or_create(id=1, defaults={
                'name': 'Paltín',
                'system_prompt': default_prompt,
                'additional_info': 'Horarios de atención: Lunes a Sábado de 09:00 a 19:00 hrs. Entregas a domicilio y retiro gratuito en local.',
                'human_notification_phone': '',
            })
            if not config.system_prompt:
                config.system_prompt = default_prompt
                config.save()
            return Response(AgentConfigSerializer(config).data)
        except Exception:
            return Response({
                'id': 1, 'name': 'Paltín', 'system_prompt': default_prompt,
                'additional_info': 'Horarios de atención: Lunes a Sábado de 09:00 a 19:00 hrs.',
                'human_notification_phone': '', 'whatsapp_connected_phone': '',
                'ai_provider': 'claude', 'api_key': '',
            })

    def post(self, request):
        try:
            config, _ = AgentConfig.objects.get_or_create(id=1)
            serializer = AgentConfigSerializer(config, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

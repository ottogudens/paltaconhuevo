from rest_framework import serializers
from .models import Campaign, Contest, Offer, AgentConfig, WhatsAppSession, WhatsAppFlow
from django.contrib.auth import get_user_model

User = get_user_model()

class CampaignSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    class Meta:
        model = Campaign
        fields = '__all__'

class ContestSerializer(serializers.ModelSerializer):
    winner_name = serializers.CharField(source='winner.get_full_name', read_only=True, default='')
    class Meta:
        model = Contest
        fields = '__all__'

class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = '__all__'

class AgentConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentConfig
        fields = '__all__'


class WhatsAppSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppSession
        fields = '__all__'


class WhatsAppFlowSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppFlow
        fields = '__all__'

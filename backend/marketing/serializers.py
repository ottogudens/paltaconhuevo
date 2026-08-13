from rest_framework import serializers
from .models import Campaign, Contest, Offer, AgentConfig, WhatsAppSession

class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = '__all__'

class ContestSerializer(serializers.ModelSerializer):
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


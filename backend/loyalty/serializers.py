from rest_framework import serializers
from .models import LoyaltyAccount, PointTransaction

class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = '__all__'

class LoyaltyAccountSerializer(serializers.ModelSerializer):
    transactions = PointTransactionSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    class Meta:
        model = LoyaltyAccount
        fields = '__all__'

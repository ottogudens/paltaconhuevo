from rest_framework import serializers
from .models import LoyaltyAccount, PointTransaction, Reward, RewardRedemption

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

class RewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reward
        fields = '__all__'

class RewardRedemptionSerializer(serializers.ModelSerializer):
    reward_name = serializers.CharField(source='reward.name', read_only=True)
    discount_value = serializers.DecimalField(source='reward.discount_value', max_digits=10, decimal_places=0, read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)

    class Meta:
        model = RewardRedemption
        fields = '__all__'

from django.db import models
from django.conf import settings

class LoyaltyAccount(models.Model):
    LEVEL_CHOICES = [('bronce','Bronce'),('plata','Plata'),('oro','Oro'),('premium','Premium')]
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='loyalty')
    points = models.IntegerField(default=0)
    total_points_earned = models.IntegerField(default=0)
    level = models.CharField(max_length=20, choices=LEVEL_CHOICES, default='bronce')
    total_purchases = models.DecimalField(max_digits=14, decimal_places=0, default=0)
    updated_at = models.DateTimeField(auto_now=True)

    def update_level(self):
        if self.points >= 3001:
            self.level = 'premium'
        elif self.points >= 1501:
            self.level = 'oro'
        elif self.points >= 501:
            self.level = 'plata'
        else:
            self.level = 'bronce'
        self.save()

    def __str__(self):
        return f"{self.user} - {self.level} - {self.points} pts"

class PointTransaction(models.Model):
    TYPE_CHOICES = [('ganado','Ganado'),('canjeado','Canjeado'),('bonus','Bonus'),('expirado','Expirado')]
    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    points = models.IntegerField()
    description = models.CharField(max_length=200)
    reference_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.account.user} {self.transaction_type} {self.points} pts"

class ContestParticipant(models.Model):
    contest_id = models.IntegerField()
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('contest_id', 'user')

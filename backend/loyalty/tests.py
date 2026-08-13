from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from loyalty.models import LoyaltyAccount, PointTransaction

User = get_user_model()


class LoyaltyTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='cliente_puntos', password='password123', first_name='Maria')
        self.client.force_authenticate(user=self.user)

    def test_loyalty_account_creation_and_level_progression(self):
        account = LoyaltyAccount.objects.create(user=self.user, points=100)
        self.assertEqual(account.level, 'bronce')

        # Subir a Plata (501+ pts)
        account.points = 600
        account.update_level()
        self.assertEqual(account.level, 'plata')

        # Subir a Oro (1501+ pts)
        account.points = 1800
        account.update_level()
        self.assertEqual(account.level, 'oro')

        # Subir a Premium (3001+ pts)
        account.points = 4000
        account.update_level()
        self.assertEqual(account.level, 'premium')

    def test_loyalty_my_endpoint(self):
        LoyaltyAccount.objects.create(user=self.user, points=250, level='bronce')
        response = self.client.get('/api/loyalty/my/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['points'], 250)
        self.assertEqual(response.data['level'], 'bronce')

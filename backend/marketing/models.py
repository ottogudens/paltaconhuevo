from django.db import models
from django.conf import settings

class Campaign(models.Model):
    STATUS_CHOICES = [('borrador','Borrador'),('programada','Programada'),('enviada','Enviada'),('cancelada','Cancelada')]
    CHANNEL_CHOICES = [('whatsapp','WhatsApp'),('email','Email'),('ambos','Ambos')]
    TARGET_CHOICES = [('todos','Todos los clientes'),('bronce','Nivel Bronce'),('plata','Nivel Plata'),('oro','Nivel Oro'),('premium','Nivel Premium'),('manual','Selección manual')]

    title = models.CharField(max_length=200)
    message = models.TextField()
    image = models.ImageField(upload_to='campaigns/', null=True, blank=True)
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES, default='ambos')
    target_segment = models.CharField(max_length=20, choices=TARGET_CHOICES, default='todos')
    scheduled_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='borrador')
    recipients_count = models.IntegerField(default=0)
    ai_generated = models.BooleanField(default=False)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.status})"

class Contest(models.Model):
    STATUS_CHOICES = [('activo','Activo'),('finalizado','Finalizado'),('cancelado','Cancelado')]
    REWARD_CHOICES = [('producto','Producto gratis'),('descuento','Descuento'),('puntos','Puntos bonus'),('despacho','Despacho gratis')]

    name = models.CharField(max_length=200)
    description = models.TextField()
    reward_type = models.CharField(max_length=20, choices=REWARD_CHOICES)
    reward_description = models.CharField(max_length=300)
    min_purchase_amount = models.DecimalField(max_digits=12, decimal_places=0, default=0)
    min_points = models.IntegerField(default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='activo')
    winner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='won_contests')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.status})"

class Offer(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    image = models.ImageField(upload_to='offers/', null=True, blank=True)
    valid_from = models.DateField()
    valid_until = models.DateField()
    is_active = models.BooleanField(default=True)
    ai_generated = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.discount_percentage}% off)"

class AgentConfig(models.Model):
    PROVIDER_CHOICES = [('claude', 'Claude (Anthropic)'), ('chatgpt', 'ChatGPT (OpenAI)'), ('gemini', 'Gemini (Google)')]
    name = models.CharField(max_length=100, default='Paltín')
    system_prompt = models.TextField(blank=True)
    additional_info = models.TextField(blank=True)
    human_notification_phone = models.CharField(max_length=30, blank=True)
    whatsapp_connected_phone = models.CharField(max_length=30, blank=True)
    ai_provider = models.CharField(max_length=20, choices=PROVIDER_CHOICES, default='claude')
    api_key = models.CharField(max_length=255, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Configuración Agente IA ({self.name})"


class WhatsAppSession(models.Model):
    """
    Persistencia del estado del agente de WhatsApp en base de datos.
    Reemplaza el Map() en memoria de Node.js.
    """
    phone = models.CharField(max_length=30, unique=True)
    session_data = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Sesión WhatsApp ({self.phone})"


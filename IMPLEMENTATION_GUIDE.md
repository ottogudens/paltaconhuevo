# 🥑 Guía de Implementación - Palta con Huevo

## 📋 Contenido del Proyecto

El proyecto **Palta con Huevo** incluye 3 servicios independientes:

1. **Backend Django REST** - API completa con 7 módulos
2. **Frontend React** - Interfaz responsive con diseño verde y amarillo
3. **WhatsApp Agent** - Bot IA 24/7 con Baileys + Claude API

## 🚀 Paso 1: Preparar el Proyecto en GitHub

```bash
# Crear repositorio en GitHub
# https://github.com/new

# Clonar y subir
git clone https://github.com/tu-usuario/palta-con-huevo.git
cd palta-con-huevo
git add .
git commit -m "Initial commit: Full stack app for Palta con Huevo"
git push -u origin main
```

## 🛤️ Paso 2: Configurar Railway

### 2.1 Crear Proyecto en Railway
1. Ir a https://railway.app
2. Click en "New Project"
3. Seleccionar "GitHub Repo"
4. Conectar el repositorio de GitHub

### 2.2 Agregar PostgreSQL
```
Infrastructure → Add Service → PostgreSQL
```
Railway creará automáticamente: `DATABASE_URL`

### 2.3 Crear Servicios

#### Servicio 1: Backend Django
```
New Service → GitHub Repo → backend directory

Environment Variables:
- SECRET_KEY = (generar con: python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
- DEBUG = False
- ALLOWED_HOSTS = tu-dominio.railway.app
- ANTHROPIC_API_KEY = tu-api-key-de-claude
- MERCADOPAGO_ACCESS_TOKEN = APP_USR-...
- SENDGRID_API_KEY = SG...
- WHATSAPP_SERVICE_URL = https://whatsapp-agent.railway.app

Port: 8000
Build Command: collectstatic --noinput
```

#### Servicio 2: Frontend React
```
New Service → GitHub Repo → frontend directory

Environment Variables:
- VITE_API_URL = https://backend-domain.railway.app/api

Port: 3000
Build Command: npm run build
Start Command: npm run preview
```

#### Servicio 3: WhatsApp Agent
```
New Service → GitHub Repo → whatsapp-agent directory

Environment Variables:
- ANTHROPIC_API_KEY = sk-ant-...
- DJANGO_API_URL = https://backend-domain.railway.app/api
- DJANGO_API_TOKEN = (token de admin en la app)
- INTERNAL_TOKEN = (generar token aleatorio para webhooks)

Port: 3001
```

## 🔐 Paso 3: Primeras Configuraciones

### 3.1 Acceder al Admin Django
```
https://tu-backend.railway.app/admin/
Usuario: admin
Contraseña: admin123 (cambiar después!)
```

### 3.2 Crear API Token para WhatsApp Agent
```
1. Ir a /admin/authtoken/token/
2. Crear token para usuario admin
3. Copiar token en DJANGO_API_TOKEN del WhatsApp Agent
```

### 3.3 Configurar Mercadopago
```
1. Crear cuenta en mercadopago.com
2. Ir a Credenciales
3. Copiar Access Token a MERCADOPAGO_ACCESS_TOKEN
4. Configurar Webhook URL:
   POST https://tu-backend.railway.app/api/orders/webhook/mercadopago/
```

### 3.4 Configurar SendGrid
```
1. Crear cuenta en sendgrid.com
2. Ir a Setup Guide → API Keys
3. Crear API key
4. Copiar a SENDGRID_API_KEY
```

### 3.5 Configurar Claude API
```
1. Ir a https://console.anthropic.com
2. Crear API key
3. Copiar a ANTHROPIC_API_KEY (todos los servicios)
```

## 📱 Paso 4: Configurar WhatsApp Agent

### Primer Inicio
```
1. El agente mostrará un QR en los logs
2. Abrir WhatsApp en tu celular
3. Ir a Configuración → Dispositivos vinculados
4. Escanear el QR
5. El número de WhatsApp quedaría vinculado como bot
```

### Endpoints Útiles
```bash
# Verificar estado del agente
GET https://tu-whatsapp.railway.app/health

# Enviar mensaje de prueba (desde backend)
POST https://tu-whatsapp.railway.app/send
Headers: Authorization: Bearer INTERNAL_TOKEN
Body: {"to": "56912345678", "message": "¡Hola!"}
```

## 💾 Paso 5: Datos Iniciales

Los scripts automáticos crean:
- ✅ Usuario admin: `admin / admin123`
- ✅ Usuario vendedor: `vendedor / vendedor123`
- ✅ 5 clientes de prueba: `cliente0-4 / cliente123`
- ✅ 4 productos (2 paltas, 2 huevos)

## 🧪 Paso 6: Testing

### Test del Backend
```bash
# Crear pedido de prueba
POST /api/orders/
{
  "customer_id": 2,
  "delivery_type": "retiro",
  "payment_method": "mercadopago",
  "items": [
    {"product_id": 1, "quantity": 2, "unit_price": 3500}
  ]
}
```

### Test del Frontend
```
https://tu-frontend.railway.app/login
Usuario: cliente0
Contraseña: cliente123
```

### Test del WhatsApp
```
Enviar mensaje a tu número registrado como agente
El bot debería responder automáticamente
```

## 🎨 Personalización del Branding

### Cambiar Colores
Editar `frontend/tailwind.config.js`:
```javascript
colors: {
  'palta': { 500: '#3cb853', ... },  // Cambiar verdes
  'huevo': { 500: '#ffc127', ... }   // Cambiar amarillos
}
```

### Cambiar Nombre/Logo
- Editar en `frontend/src/components/Navbar.jsx`
- Cambiar emoji 🥑🥚 por logo

## 📊 Monitoreo en Railway

1. **Logs**: Ver en cada servicio
2. **Métricas**: CPU, Memory, Network
3. **Analytics**: Ver en el dashboard

## 🔄 Workflow Típico

1. **Cliente registra/se autentica por WhatsApp**
2. **Agente IA muestra menú de productos**
3. **Cliente ordena: "quiero 2 paltas y una docena de huevos"**
4. **Agente confirma y pide dirección**
5. **Agente genera link de pago con MercadoPago**
6. **Cliente paga**
7. **Sistema registra pedido y puntos en la BD**
8. **Agente confirma y envía información de despacho**
9. **Admin ve el pedido en dashboard web**
10. **Admin marca como entregado**

## 🛑 Troubleshooting

### "Backend está offline"
- Verificar en Railway → Logs
- Revisar variables de entorno
- Ejecutar `railway run python manage.py migrate`

### "WhatsApp no responde"
- Verificar QR está escaneado
- Revisar token en DJANGO_API_TOKEN
- Ver logs del agente en Railway

### "MercadoPago no funciona"
- Verificar Access Token en Mercadopago.com
- Confirmar Webhook URL está correcta
- Ver logs de webhook

### "Emails no se envían"
- Verificar SENDGRID_API_KEY
- Revisar email en SENDGRID_FROM_EMAIL
- Confirmar en SendGrid que la cuenta está activa

## 📞 Soporte Post-Implementación

Los servicios incluyen:
- ✅ API documentada con docstrings
- ✅ Logs detallados en cada servicio
- ✅ Scripts de inicialización automáticos
- ✅ Dockerfile optimizados
- ✅ Configuración para Railway

## 🎯 Próximas Fases (Opcionales)

- Agregar SMS (Twilio) además de WhatsApp
- Dashboard avanzado con gráficos
- App móvil nativa (React Native)
- Análisis predictivo de stock
- Integración con Instagram DM
- Sistema de devoluciones

---

**¡Proyecto completamente funcional y listo para producción!** 🚀

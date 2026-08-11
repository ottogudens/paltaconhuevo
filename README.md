# 🥑🥚 Palta con Huevo - Plataforma de Gestión de Ventas

Sistema integral de gestión de ventas para emprendimiento de paltas y huevos con agente IA por WhatsApp.

## 🎯 Características

✅ **Gestión de Clientes** - Registro manual o vía OAuth social  
✅ **Gestión de Pedidos** - Creación, seguimiento y despacho  
✅ **Gestión de Compras** - Registro de compras al proveedor  
✅ **Ingresos y Egresos** - Control financiero completo  
✅ **Puntos de Fidelización** - Sistema de rewards por compras  
✅ **Concursos y Regalos** - Campañas de marketing  
✅ **Blog de Recetas** - Contenido generado con IA  
✅ **Agente WhatsApp 24/7** - Tomar pedidos, procesar pagos  
✅ **MercadoPago** - Integración de pagos online  
✅ **Análisis IA** - Insights y recomendaciones  
✅ **Export/Import Excel** - Datos en planillas  

## 📁 Estructura del Proyecto

```
palta-con-huevo/
├── backend/                 # Django REST API
│   ├── core/               # Configuración principal
│   ├── users/              # Gestión de usuarios y autenticación
│   ├── products/           # Productos y compras
│   ├── orders/             # Pedidos y entregas
│   ├── finance/            # Ingresos y egresos
│   ├── marketing/          # Campañas, ofertas, concursos
│   ├── recipes/            # Blog de recetas
│   ├── loyalty/            # Sistema de puntos
│   ├── requirements.txt    # Dependencias Python
│   ├── manage.py
│   └── Dockerfile
├── frontend/               # React + Vite + Tailwind
│   ├── src/
│   │   ├── pages/         # Páginas de la app
│   │   ├── components/    # Componentes reutilizables
│   │   ├── services/      # Cliente API
│   │   ├── store/         # Estado global (Zustand)
│   │   └── App.jsx
│   ├── package.json
│   └── Dockerfile
└── whatsapp-agent/         # Bot de WhatsApp con Baileys + IA
    ├── src/
    │   └── index.js       # Agente principal
    ├── package.json
    └── Dockerfile
```

## 🚀 Instalación Local

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Accede en http://localhost:5173
```

### WhatsApp Agent
```bash
cd whatsapp-agent
npm install
npm start
# Escanea el QR con WhatsApp
```

## 🔑 Variables de Entorno

### Backend (.env)
```env
SECRET_KEY=your-django-secret-key
DEBUG=True
ANTHROPIC_API_KEY=sk-ant-...
MERCADOPAGO_ACCESS_TOKEN=APP_USR-...
SENDGRID_API_KEY=SG.xxx
WHATSAPP_SERVICE_URL=http://localhost:3001
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:8000/api
```

### WhatsApp Agent (.env)
```env
ANTHROPIC_API_KEY=sk-ant-...
DJANGO_API_URL=http://localhost:8000/api
```

## 🚢 Deploy en Railway

1. **Crear proyecto en Railway:**
   ```bash
   railway login
   railway init
   ```

2. **Configurar servicios:**
   - Backend Django (Puerto 8000)
   - Frontend (Puerto 3000)
   - WhatsApp Agent (Puerto 3001)
   - PostgreSQL (Base de datos)

3. **Variables de entorno en Railway:**
   - Copiar valores de `.env.example` de cada servicio
   - Reemplazar URLs locales por URLs de Railway

4. **Deploy:**
   ```bash
   railway up
   ```

## 📱 Flujo WhatsApp

El agente IA maneja automáticamente:

1. **Registro/Autenticación** - Nuevo usuario o login
2. **Menú Principal** - Opciones disponibles
3. **Tomar Pedidos** - Catálogo y agregar al carrito
4. **Despacho** - Retiro o entrega a domicilio
5. **Pagos** - MercadoPago o efectivo
6. **Puntos** - Visualizar saldo de puntos
7. **Recetas** - Sugerencias de cocina

## 🤖 IA + Claude API

- Generación de recetas con información nutricional
- Análisis de tendencias de venta
- Optimización de precios y ofertas
- Conversación natural en WhatsApp
- Recomendaciones personalizadas

## 💳 Integraciones

- **Baileys** - WhatsApp Web sin API oficial
- **MercadoPago** - Pagos online
- **SendGrid** - Email marketing
- **OAuth** - Google, Facebook, Instagram
- **Claude API** - IA conversacional

## 📊 Modelos de Datos

### User
- Rol: admin, vendedor, cliente
- Datos sociales: ubicación, intereses, perfil
- Preferencias de pago

### Order
- Estado del pedido
- Despacho a domicilio o retiro
- Método y condición de pago
- Cálculo automático de margen y puntos

### Recipe
- Información nutricional detallada
- Ingredientes y pasos
- Likes y guardados
- SEO optimizado

### Transaction
- Registro de ingresos/egresos
- Categorización automática
- Reportes por período

### LoyaltyAccount
- Puntos acumulados
- Niveles (Bronce, Plata, Oro, Premium)
- Historial de transacciones

## 📝 Licencia

Este proyecto es propiedad de **Skale Agency**

## 👥 Soporte

Para consultas y soporte: support@skaleagency.com

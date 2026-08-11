require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const logger = pino({ level: 'silent' });
const app = express();
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_URL = process.env.DJANGO_API_URL;
const API_TOKEN = process.env.DJANGO_API_TOKEN;

// Memoria de sesiones por usuario
const sessions = new Map();
let waSocket = null;

// API helper
const api = {
  get: (path, token) => axios.get(`${API_URL}${path}`, { headers: { Authorization: `Token ${token || API_TOKEN}` } }),
  post: (path, data, token) => axios.post(`${API_URL}${path}`, data, { headers: { Authorization: `Token ${token || API_TOKEN}` } }),
};

// Obtener o crear sesión de usuario
function getSession(phone) {
  if (!sessions.has(phone)) {
    sessions.set(phone, { history: [], step: 'menu', cart: [], userToken: null, userData: null });
  }
  return sessions.get(phone);
}

// Responder al usuario
async function sendMessage(phone, message) {
  if (!waSocket) return;
  const jid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
  await waSocket.sendMessage(jid, { text: message });
}

// Login del cliente
async function loginUser(phone) {
  try {
    const res = await api.post('/auth/login/', { username: phone, password: phone });
    return { token: res.data.token, user: res.data.user };
  } catch {
    return null;
  }
}

// Registrar cliente nuevo
async function registerUser(phone, name) {
  try {
    const res = await api.post('/auth/register/', {
      username: phone, password: phone,
      first_name: name.split(' ')[0],
      last_name: name.split(' ').slice(1).join(' ') || '',
      phone, whatsapp_number: phone, email: `${phone}@whatsapp.cl`
    });
    return { token: res.data.token, user: res.data.user };
  } catch (e) {
    return null;
  }
}

// Obtener productos disponibles
async function getProducts() {
  const res = await api.get('/products/');
  return res.data.results || res.data;
}

// Obtener puntos del usuario
async function getUserPoints(token) {
  const res = await api.get('/loyalty/my/', token);
  return res.data;
}

// Crear pedido
async function createOrder(session, deliveryType, address, commune, reference) {
  const items = session.cart.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.sale_price }));
  const res = await api.post('/orders/', {
    items,
    delivery_type: deliveryType,
    delivery_address: address || '',
    delivery_commune: commune || '',
    delivery_reference: reference || '',
    payment_method: 'mercadopago',
    payment_condition: 'inmediato',
  }, session.userToken);
  return res.data;
}

// Generar link MercadoPago
async function generatePaymentLink(orderId) {
  const res = await api.post(`/orders/${orderId}/mercadopago/`, {});
  return res.data.link;
}

// IA conversacional principal
async function processWithAI(session, userMessage) {
  const products = await getProducts();
  const productList = products.map(p => `- ${p.name} (${p.product_type}): $${p.sale_price} por ${p.unit}`).join('\n');
  const cartSummary = session.cart.length > 0
    ? session.cart.map(i => `${i.quantity}x ${i.product.name} = $${i.quantity * i.product.sale_price}`).join(', ')
    : 'vacío';

  const systemPrompt = `Eres el asistente virtual de "Palta con Huevo" 🥑, un negocio chileno de venta de paltas y huevos.
Tu nombre es Paltín. Hablas en español chileno, eres amable, cercano y usas emojis con moderación.

PRODUCTOS DISPONIBLES:
${productList}

CARRITO ACTUAL: ${cartSummary}
CLIENTE: ${session.userData?.first_name || 'Cliente'}

CAPACIDADES:
- Tomar pedidos de paltas y huevos
- Consultar stock y precios
- Gestionar el carrito de compras
- Coordinar despacho a domicilio o retiro en local
- Informar sobre puntos de fidelidad
- Compartir ofertas vigentes
- Dar recetas con paltas y huevos
- Procesar pagos via MercadoPago

INSTRUCCIONES:
- Cuando el cliente quiera CONFIRMAR el pedido, responde con [CONFIRMAR_PEDIDO]
- Cuando quiera PAGAR, responde con [GENERAR_PAGO]
- Cuando pida DESPACHO a domicilio, responde con [PEDIR_DIRECCION]
- Cuando dé una dirección, responde con [DIRECCION:dirección|comuna|referencia]
- Para ver sus PUNTOS, responde con [VER_PUNTOS]
- Para ver RECETAS, responde con [VER_RECETAS]
- Sé conciso, máximo 3-4 líneas por respuesta`;

  session.history.push({ role: 'user', content: userMessage });
  if (session.history.length > 20) session.history = session.history.slice(-20);

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: systemPrompt,
    messages: session.history,
  });

  const response = msg.content[0].text;
  session.history.push({ role: 'assistant', content: response });
  return response;
}

// Agregar al carrito desde el mensaje de IA
function parseCartAction(message, products) {
  // Simple parser: busca patrones como "2x Palta Hass"
  const matches = message.matchAll(/(\d+)\s*x\s*([^,\n]+)/gi);
  for (const match of matches) {
    const qty = parseInt(match[1]);
    const name = match[2].trim().toLowerCase();
    const product = products.find(p => p.name.toLowerCase().includes(name));
    if (product) return { product, quantity: qty };
  }
  return null;
}

// Handler principal de mensajes
async function handleMessage(phone, message) {
  const session = getSession(phone);

  try {
    // Verificar si usuario está registrado
    if (!session.userToken) {
      const auth = await loginUser(phone);
      if (auth) {
        session.userToken = auth.token;
        session.userData = auth.user;
      } else {
        // Nuevo usuario
        if (!session.awaitingName) {
          session.awaitingName = true;
          return `¡Hola! 👋 Bienvenid@ a *Palta con Huevo* 🥑🥚\nSoy Paltín, tu asistente virtual.\n\n¿Cuál es tu nombre para registrarte?`;
        } else {
          const auth = await registerUser(phone, message);
          if (auth) {
            session.userToken = auth.token;
            session.userData = auth.user;
            session.awaitingName = false;
            return `¡Listo ${auth.user.first_name}! ✅ Te registré con éxito.\n\n${getMenu()}`;
          }
          return '❌ Hubo un problema al registrarte. Intenta de nuevo.';
        }
      }
    }

    // Comandos rápidos
    const lower = message.toLowerCase().trim();
    if (['hola','inicio','menu','menú','0'].includes(lower)) {
      return getMenu();
    }
    if (lower === 'mis puntos' || lower === 'puntos') {
      const loyalty = await getUserPoints(session.userToken);
      return `⭐ Tus puntos: *${loyalty.points} pts* (Nivel ${loyalty.level})\n💰 Total compras: $${loyalty.total_purchases}`;
    }

    // Procesar con IA
    const aiResponse = await processWithAI(session, message);

    // Procesar comandos especiales
    if (aiResponse.includes('[CONFIRMAR_PEDIDO]')) {
      if (session.cart.length === 0) return '🛒 Tu carrito está vacío. ¿Qué deseas pedir?';
      const total = session.cart.reduce((s, i) => s + i.quantity * i.product.sale_price, 0);
      const cartText = session.cart.map(i => `${i.quantity}x ${i.product.name} = $${i.quantity * i.product.sale_price}`).join('\n');
      session.step = 'confirming';
      return `📋 *Tu pedido:*\n${cartText}\n\n💵 Total: *$${total}*\n\n¿Cómo lo recibes?\n1️⃣ Despacho a domicilio\n2️⃣ Retiro en local`;
    }

    if (aiResponse.includes('[PEDIR_DIRECCION]') || session.step === 'confirming' && message === '1') {
      session.step = 'awaiting_address';
      return '🏠 Por favor indícame tu dirección de entrega (calle y número, comuna):';
    }

    if (session.step === 'confirming' && message === '2') {
      session.step = 'awaiting_payment';
      session.deliveryType = 'retiro';
      const total = session.cart.reduce((s, i) => s + i.quantity * i.product.sale_price, 0);
      return `✅ Retiro en local confirmado.\n\n💳 Total a pagar: *$${total}*\n\n¿Cómo quieres pagar?\n1️⃣ MercadoPago (link de pago)\n2️⃣ Efectivo al retirar\n3️⃣ Transferencia`;
    }

    if (aiResponse.includes('[GENERAR_PAGO]') || (session.step === 'awaiting_payment' && message === '1')) {
      const order = await createOrder(session, session.deliveryType || 'retiro', session.deliveryAddress, session.deliveryCommune, session.deliveryReference);
      const link = await generatePaymentLink(order.id);
      session.cart = [];
      session.step = 'menu';
      return `🎉 ¡Pedido #${order.id} creado!\n\n💳 Paga aquí:\n${link}\n\n⭐ Ganaste *${order.points_earned} puntos* con esta compra.`;
    }

    if (session.step === 'awaiting_address') {
      const parts = message.split(',');
      session.deliveryAddress = parts[0]?.trim() || message;
      session.deliveryCommune = parts[1]?.trim() || '';
      session.deliveryReference = parts[2]?.trim() || '';
      session.deliveryType = 'despacho';
      session.step = 'awaiting_payment';
      const total = session.cart.reduce((s, i) => s + i.quantity * i.product.sale_price, 0);
      return `📍 Dirección registrada: *${session.deliveryAddress}*\n\n💳 Total: *$${total}* + costo de despacho\n\n¿Cómo quieres pagar?\n1️⃣ MercadoPago (link de pago)\n2️⃣ Efectivo al entregar\n3️⃣ Transferencia`;
    }

    // Agregar productos al carrito si la IA los menciona
    const products = await getProducts();
    for (const product of products) {
      const regex = new RegExp(`(\\d+)\\s*(${product.name}|${product.product_type})`, 'i');
      const match = message.match(regex);
      if (match) {
        const qty = parseInt(match[1]);
        const existing = session.cart.find(i => i.product.id === product.id);
        if (existing) existing.quantity += qty;
        else session.cart.push({ product, quantity: qty });
      }
    }

    return aiResponse.replace('[CONFIRMAR_PEDIDO]','').replace('[GENERAR_PAGO]','').replace('[PEDIR_DIRECCION]','').replace(/\[DIRECCION:[^\]]+\]/g,'').replace('[VER_PUNTOS]','').replace('[VER_RECETAS]','').trim();

  } catch (error) {
    console.error('Error:', error.message);
    return '❌ Tuve un problema. Intenta de nuevo o escribe "menu" para volver al inicio.';
  }
}

function getMenu() {
  return `🥑🥚 *Palta con Huevo*\n\n¡Hola! Soy Paltín, tu asistente. ¿En qué te ayudo?\n\n📦 Para pedir, dime qué quieres (ej: "quiero 2 paltas y una docena de huevos")\n⭐ "mis puntos" - Ver tus puntos\n🍳 "recetas" - Ideas de cocina\n🎁 "ofertas" - Ver ofertas del día\n\n¡Escríbeme lo que necesitas!`;
}

// Express server para recibir mensajes del backend
app.post('/send', (req, res) => {
  const { to, message } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.INTERNAL_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  sendMessage(to, message);
  res.json({ sent: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok', connected: !!waSocket }));

// Iniciar Baileys
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const sock = makeWASocket({ auth: state, logger, printQRInTerminal: false });
  waSocket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      console.log('\n📱 Escanea este QR con WhatsApp:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(startWhatsApp, 5000);
    }
    if (connection === 'open') console.log('✅ WhatsApp conectado');
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      const phone = msg.key.remoteJid.replace('@s.whatsapp.net', '').replace('@g.us', '');
      if (msg.key.remoteJid.includes('@g.us')) continue; // Ignorar grupos
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      if (!text) continue;
      console.log(`📩 ${phone}: ${text}`);
      const response = await handleMessage(phone, text);
      if (response) await sendMessage(phone, response);
    }
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 WhatsApp Agent corriendo en puerto ${PORT}`));
startWhatsApp();

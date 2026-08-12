require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const qrcode = require('qrcode-terminal');
const pino = require('pino');

const logger = pino({ level: 'silent' });
const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_URL = process.env.DJANGO_API_URL;
const API_TOKEN = process.env.DJANGO_API_TOKEN;

// Memoria de sesiones por usuario
const sessions = new Map();
let waSocket = null;
let currentQR = null;
let isConnected = false;

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

// Obtener configuración dinámica del agente desde Django
async function getAgentConfig() {
  try {
    const res = await api.get('/marketing/agent-config/');
    return res.data;
  } catch (e) {
    return {
      name: 'Paltín',
      system_prompt: 'Eres el asistente virtual de "Palta con Huevo" 🥑, un negocio chileno de venta de paltas y huevos.',
      additional_info: '',
      human_notification_phone: ''
    };
  }
}

// Notificar a un humano por WhatsApp si hay un mensaje derivado
async function notifyHumanOperator(customerPhone, customerName) {
  try {
    const config = await getAgentConfig();
    const targetPhone = config.human_notification_phone;
    if (targetPhone) {
      const msg = `🚨 *¡ATENCIÓN OPERADOR!* 🚨\nEl cliente *${customerName || 'Cliente'}* (${customerPhone}) ha sido derivado a un operador humano y requiere asistencia.\n\nPor favor ingresa al panel de control en la sección "WhatsApp Bot" para responder el chat.`;
      await sendMessage(targetPhone, msg);
    }
  } catch (e) {
    console.error('Error enviando notificación a humano:', e.message);
  }
}

// IA conversacional principal
async function processWithAI(session, userMessage, customerPhone) {
  const [products, config] = await Promise.all([
    getProducts(),
    getAgentConfig()
  ]);

  const productList = products.map(p => `- ${p.name} (${p.product_type}): Precio venta $${p.sale_price} por ${p.unit} (Stock: ${p.stock})`).join('\n');
  const cartSummary = session.cart.length > 0
    ? session.cart.map(i => `${i.quantity}x ${i.product.name} = $${i.quantity * i.product.sale_price}`).join(', ')
    : 'vacío';

  const basePrompt = config.system_prompt || 'Eres el asistente virtual de "Palta con Huevo" 🥑.';
  const extraInfo = config.additional_info ? `\nINFORMACIÓN ADICIONAL DEL NEGOCIO:\n${config.additional_info}` : '';

  const systemPrompt = `${basePrompt}
${extraInfo}

PRODUCTOS REGISTRADOS EN EL SISTEMA:
${productList}

CARRITO ACTUAL: ${cartSummary}
CLIENTE: ${session.userData?.first_name || 'Cliente'} (${customerPhone})

INSTRUCCIONES Y REGLAS DE RESPUESTA:
- Utiliza la información de productos y precios registrados arriba.
- Si el cliente solicita hablar con una persona real, un humano, un ejecutivo o soporte técnico, o si no entiendes su consulta técnica, responde incluyendo el comando [DERIVAR_HUMANO].
- Cuando el cliente quiera CONFIRMAR el pedido, responde incluyendo [CONFIRMAR_PEDIDO].
- Cuando quiera PAGAR, responde incluyendo [GENERAR_PAGO].
- Cuando pida DESPACHO a domicilio, responde incluyendo [PEDIR_DIRECCION].
- Para ver sus PUNTOS, responde incluyendo [VER_PUNTOS].
- Sé conciso, amable y profesional (máximo 3-4 líneas por respuesta).`;

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

// Handler principal de mensajes
async function handleMessage(phone, message) {
  const session = getSession(phone);

  // Registrar timestamp del último mensaje
  session.lastMessageAt = new Date().toISOString();
  if (!session.messages) session.messages = [];
  session.messages.push({ sender: 'customer', text: message, timestamp: session.lastMessageAt });

  // Si el chat está en modo humano (atendido por operador manual)
  if (session.isHumanMode) {
    return null; // La IA no interviene
  }

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
          const welcome = `¡Hola! 👋 Bienvenid@ a *Palta con Huevo* 🥑🥚\nSoy Paltín, tu asistente virtual.\n\n¿Cuál es tu nombre para registrarte?`;
          session.messages.push({ sender: 'bot', text: welcome, timestamp: new Date().toISOString() });
          return welcome;
        } else {
          const auth = await registerUser(phone, message);
          if (auth) {
            session.userToken = auth.token;
            session.userData = auth.user;
            session.awaitingName = false;
            const regSuccess = `¡Listo ${auth.user.first_name}! ✅ Te registré con éxito.\n\n${getMenu()}`;
            session.messages.push({ sender: 'bot', text: regSuccess, timestamp: new Date().toISOString() });
            return regSuccess;
          }
          return '❌ Hubo un problema al registrarte. Intenta de nuevo.';
        }
      }
    }

    // Solicitud explícita de derivación humana por palabras clave
    const lower = message.toLowerCase().trim();
    if (['humano', 'operador', 'persona', 'agente real', 'atencion humana', 'soporte'].includes(lower)) {
      session.isHumanMode = true;
      session.pendingHuman = true;
      notifyHumanOperator(phone, session.userData?.first_name);
      const transferMsg = '👨‍💼 Te transfiero de inmediato con un operador humano. Un momento por favor, te responderemos pronto.';
      session.messages.push({ sender: 'bot', text: transferMsg, timestamp: new Date().toISOString() });
      return transferMsg;
    }

    // Comandos rápidos
    if (['hola','inicio','menu','menú','0'].includes(lower)) {
      const menuText = getMenu();
      session.messages.push({ sender: 'bot', text: menuText, timestamp: new Date().toISOString() });
      return menuText;
    }
    if (lower === 'mis puntos' || lower === 'puntos') {
      const loyalty = await getUserPoints(session.userToken);
      const pointsText = `⭐ Tus puntos: *${loyalty.points} pts* (Nivel ${loyalty.level})\n💰 Total compras: $${loyalty.total_purchases}`;
      session.messages.push({ sender: 'bot', text: pointsText, timestamp: new Date().toISOString() });
      return pointsText;
    }

    // Procesar con IA
    const aiResponse = await processWithAI(session, message, phone);

    // Si la IA decide derivar a humano
    if (aiResponse.includes('[DERIVAR_HUMANO]')) {
      session.isHumanMode = true;
      session.pendingHuman = true;
      notifyHumanOperator(phone, session.userData?.first_name);
      const cleanResp = aiResponse.replace('[DERIVAR_HUMANO]','').trim() || '👨‍💼 Te estoy derivando con un representante humano para ayudarte mejor. En breve se comunicarán contigo.';
      session.messages.push({ sender: 'bot', text: cleanResp, timestamp: new Date().toISOString() });
      return cleanResp;
    }

    // Procesar comandos especiales
    let botReply = '';
    if (aiResponse.includes('[CONFIRMAR_PEDIDO]')) {
      if (session.cart.length === 0) botReply = '🛒 Tu carrito está vacío. ¿Qué deseas pedir?';
      else {
        const total = session.cart.reduce((s, i) => s + i.quantity * i.product.sale_price, 0);
        const cartText = session.cart.map(i => `${i.quantity}x ${i.product.name} = $${i.quantity * i.product.sale_price}`).join('\n');
        session.step = 'confirming';
        botReply = `📋 *Tu pedido:*\n${cartText}\n\n💵 Total: *$${total}*\n\n¿Cómo lo recibes?\n1️⃣ Despacho a domicilio\n2️⃣ Retiro en local`;
      }
    } else if (aiResponse.includes('[PEDIR_DIRECCION]') || (session.step === 'confirming' && message === '1')) {
      session.step = 'awaiting_address';
      botReply = '🏠 Por favor indícame tu dirección de entrega (calle y número, comuna):';
    } else if (session.step === 'confirming' && message === '2') {
      session.step = 'awaiting_payment';
      session.deliveryType = 'retiro';
      const total = session.cart.reduce((s, i) => s + i.quantity * i.product.sale_price, 0);
      botReply = `✅ Retiro en local confirmado.\n\n💳 Total a pagar: *$${total}*\n\n¿Cómo quieres pagar?\n1️⃣ MercadoPago (link de pago)\n2️⃣ Efectivo al retirar\n3️⃣ Transferencia`;
    } else if (aiResponse.includes('[GENERAR_PAGO]') || (session.step === 'awaiting_payment' && message === '1')) {
      const order = await createOrder(session, session.deliveryType || 'retiro', session.deliveryAddress, session.deliveryCommune, session.deliveryReference);
      const link = await generatePaymentLink(order.id);
      session.cart = [];
      session.step = 'menu';
      botReply = `🎉 ¡Pedido #${order.id} creado!\n\n💳 Paga aquí:\n${link}\n\n⭐ Ganaste *${order.points_earned} puntos* con esta compra.`;
    } else if (session.step === 'awaiting_address') {
      const parts = message.split(',');
      session.deliveryAddress = parts[0]?.trim() || message;
      session.deliveryCommune = parts[1]?.trim() || '';
      session.deliveryReference = parts[2]?.trim() || '';
      session.deliveryType = 'despacho';
      session.step = 'awaiting_payment';
      const total = session.cart.reduce((s, i) => s + i.quantity * i.product.sale_price, 0);
      botReply = `📍 Dirección registrada: *${session.deliveryAddress}*\n\n💳 Total: *$${total}* + costo de despacho\n\n¿Cómo quieres pagar?\n1️⃣ MercadoPago (link de pago)\n2️⃣ Efectivo al entregar\n3️⃣ Transferencia`;
    } else {
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
      botReply = aiResponse.replace('[CONFIRMAR_PEDIDO]','').replace('[GENERAR_PAGO]','').replace('[PEDIR_DIRECCION]','').replace(/\[DIRECCION:[^\]]+\]/g,'').replace('[VER_PUNTOS]','').replace('[VER_RECETAS]','').trim();
    }

    if (botReply) {
      session.messages.push({ sender: 'bot', text: botReply, timestamp: new Date().toISOString() });
    }
    return botReply;

  } catch (error) {
    console.error('Error:', error.message);
    return '❌ Tuve un problema. Intenta de nuevo o escribe "menu" para volver al inicio.';
  }
}

function getMenu() {
  return `🥑🥚 *Palta con Huevo*\n\n¡Hola! Soy Paltín, tu asistente. ¿En qué te ayudo?\n\n📦 Para pedir, dime qué quieres (ej: "quiero 2 paltas y una docena de huevos")\n⭐ "mis puntos" - Ver tus puntos\n🍳 "recetas" - Ideas de cocina\n🎁 "ofertas" - Ver ofertas del día\n👨‍💼 "humano" - Hablar con un ejecutivo\n\n¡Escríbeme lo que necesitas!`;
}

// Endpoints API para administración de WhatsApp
app.get('/api/wa/chats', (req, res) => {
  const chatList = [];
  for (const [phone, session] of sessions.entries()) {
    chatList.push({
      phone,
      name: session.userData?.first_name ? `${session.userData.first_name} ${session.userData.last_name || ''}`.trim() : phone,
      isHumanMode: !!session.isHumanMode,
      pendingHuman: !!session.pendingHuman,
      lastMessageAt: session.lastMessageAt || new Date().toISOString(),
      messagesCount: session.messages ? session.messages.length : 0,
    });
  }
  chatList.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
  res.json(chatList);
});

app.get('/api/wa/chats/:phone/messages', (req, res) => {
  const { phone } = req.params;
  const session = getSession(phone);
  res.json({
    phone,
    name: session.userData?.first_name ? `${session.userData.first_name} ${session.userData.last_name || ''}`.trim() : phone,
    isHumanMode: !!session.isHumanMode,
    pendingHuman: !!session.pendingHuman,
    messages: session.messages || []
  });
});

app.post('/api/wa/chats/:phone/reply', async (req, res) => {
  const { phone } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

  const session = getSession(phone);
  session.isHumanMode = true;
  session.pendingHuman = false;
  session.lastMessageAt = new Date().toISOString();
  if (!session.messages) session.messages = [];
  session.messages.push({ sender: 'operator', text: message, timestamp: session.lastMessageAt });

  await sendMessage(phone, message);
  res.json({ success: true });
});

app.post('/api/wa/chats/:phone/toggle-human', (req, res) => {
  const { phone } = req.params;
  const { isHumanMode } = req.body;
  const session = getSession(phone);
  session.isHumanMode = !!isHumanMode;
  if (!isHumanMode) session.pendingHuman = false;
  res.json({ phone, isHumanMode: session.isHumanMode });
});

app.post('/send', (req, res) => {
  const { to, message } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.INTERNAL_TOKEN) return res.status(401).json({ error: 'Unauthorized' });
  sendMessage(to, message);
  res.json({ sent: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok', connected: isConnected }));
app.get('/api/wa/status', (req, res) => res.json({ connected: isConnected, has_qr: !!currentQR }));
app.get('/api/wa/qr', (req, res) => res.json({ qr: currentQR }));
app.post('/api/wa/logout', async (req, res) => {
  if (waSocket) {
    await waSocket.logout();
    isConnected = false;
    currentQR = null;
    startWhatsApp(); // Restart connection loop
  }
  res.json({ success: true });
});

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
      currentQR = qr;
      isConnected = false;
    }
    if (connection === 'close') {
      isConnected = false;
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(startWhatsApp, 5000);
      } else {
        console.log('Cierre de sesión manual. Borrando auth_info...');
        currentQR = null;
      }
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp conectado');
      isConnected = true;
      currentQR = null;
    }
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

require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Anthropic = require('@anthropic-ai/sdk');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const pino = require('pino');
const http = require('http');
const { Server } = require('socket.io');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'whatsapp-agent' }
});
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_URL = process.env.DJANGO_API_URL;
const API_TOKEN = process.env.DJANGO_API_TOKEN;

// Cache en memoria con TTL (60s)
let productsCache = { data: null, expiresAt: 0 };
let agentConfigCache = { data: null, expiresAt: 0 };

// (Memoria movida a Postgres vía API Django)
let waSocket = null;
let currentQR = null;
let isConnected = false;

// API helper
const api = {
  get: (path, token) => axios.get(`${API_URL}${path}`, { headers: { Authorization: `Token ${token || API_TOKEN}` } }),
  post: (path, data, token) => axios.post(`${API_URL}${path}`, data, { headers: { Authorization: `Token ${token || API_TOKEN}` } }),
};

function formatPhone(p) {
  let digits = p.replace(/\D/g, '');
  if (digits.startsWith('56') && digits.length === 11) return '+' + digits;
  if (digits.startsWith('56') && digits.length === 10) return '+569' + digits.slice(2);
  if (digits.startsWith('9') && digits.length === 9) return '+56' + digits;
  if (digits.length === 8) return '+569' + digits;
  return '+' + digits;
}

// Obtener o crear sesión de usuario vía API Django
async function getSession(phone) {
  try {
    const res = await api.get(`/marketing/sessions/${encodeURIComponent(phone)}/`);
    const data = res.data.session_data;
    if (!data || Object.keys(data).length === 0) {
      return { history: [], step: 'menu', cart: [], userToken: null, userData: null };
    }
    return data;
  } catch (e) {
    logger.error({ error: e.response?.data || e.message, phone }, 'Error obteniendo sesión');
    return { history: [], step: 'menu', cart: [], userToken: null, userData: null };
  }
}

// Guardar sesión de usuario vía API Django
async function saveSession(phone, sessionData) {
  try {
    await api.post(`/marketing/sessions/${encodeURIComponent(phone)}/`, { session_data: sessionData });
    io.emit('chats_updated');
    io.emit('chat_updated', { phone });
  } catch (e) {
    logger.error({ error: e.response?.data || e.message, phone }, 'Error guardando sesión');
  }
}

// Responder al usuario
async function sendMessage(phone, message) {
  if (!waSocket) return;

  const session = await getSession(phone);
  let jid = session?.remoteJid;
  
  if (!jid) {
    // Si no tenemos el JID exacto guardado, lo construimos asumiendo el formato
    let clean = phone.replace(/\D/g, '');
    if (clean.length === 9 && clean.startsWith('9')) clean = '56' + clean;
    jid = `${clean}@s.whatsapp.net`;
  }
  
  try {
    if (typeof message === 'object' && Object.keys(message).length > 0) {
      await waSocket.sendMessage(jid, message);
    } else {
      await waSocket.sendMessage(jid, { text: message });
    }
  } catch(e) {
    console.error('Error enviando mssg a', jid, e.message);
  }
}

// Autenticar / Registrar cliente de WhatsApp
async function authenticateWhatsAppUser(phone, name = '') {
  try {
    const res = await api.post('/auth/whatsapp/', { phone, name });
    return res.data;
  } catch (e) {
    logger.error({ error: e.response?.data || e.message, phone }, 'Error autenticando cliente WhatsApp');
    return null;
  }
}

// Obtener productos disponibles con caché de 60 segundos
async function getProducts() {
  const now = Date.now();
  if (productsCache.data && productsCache.expiresAt > now) {
    return productsCache.data;
  }
  try {
    const res = await api.get('/products/');
    const data = res.data.results || res.data;
    productsCache = { data, expiresAt: now + 60000 };
    return data;
  } catch (e) {
    logger.error({ error: e.message }, 'Error obteniendo productos');
    return productsCache.data || [];
  }
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

// Obtener configuración dinámica del agente desde Django con caché de 60 segundos
async function getAgentConfig() {
  const now = Date.now();
  if (agentConfigCache.data && agentConfigCache.expiresAt > now) {
    return agentConfigCache.data;
  }
  try {
    const res = await api.get('/marketing/agent-config/');
    const data = res.data;
    agentConfigCache = { data, expiresAt: now + 60000 };
    return data;
  } catch (e) {
    logger.error({ error: e.message }, 'Error obteniendo agent-config');
    return agentConfigCache.data || {
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


// Helper para formato de moneda CLP ($1.500)
const formatCLP = (amount) => `$${Math.round(amount || 0).toLocaleString('es-CL')}`;

// IA conversacional principal
async function processWithAI(session, userMessage, customerPhone) {
  const [products, config] = await Promise.all([
    getProducts(),
    getAgentConfig()
  ]);

  // Dynamic API Key
  const activeAnthropic = config.api_key && config.api_key.trim() !== '' 
    ? new Anthropic({ apiKey: config.api_key.trim() }) 
    : anthropic;

  const productList = products.map(p => `- ID ${p.id}: ${p.name} (${p.product_type}): ${formatCLP(p.sale_price)} por ${p.unit} (Stock disponible: ${p.stock})`).join('\n');
  const cartSummary = session.cart.length > 0
    ? session.cart.map(i => `${i.quantity}x ${i.product.name} = ${formatCLP(i.quantity * i.product.sale_price)}`).join(', ')
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
- Si el usuario solicita un producto sin stock o una cantidad superior al disponible, infórmale amigablemente la disponibilidad real.
- Utiliza las herramientas (tools) disponibles para:
  - Añadir productos al carrito (add_to_cart)
  - Consultar puntos (get_loyalty_points)
  - Derivar a humano (request_human)
  - Enviar botoneras (send_buttons) o listas visuales (send_list) cuando necesites preguntarle opciones y flujos guiados en lugar de solo texto.
- Sé conciso, amable y profesional (máximo 3-4 líneas por respuesta).
- Si usas una herramienta, genera una respuesta natural al usuario después de recibir el resultado de la herramienta.`;

  session.history.push({ role: 'user', content: userMessage });
  if (session.history.length > 20) session.history = session.history.slice(-20);

  // Normalizar historial para evitar errores de Anthropic (roles consecutivos)
  let currentMsg = [];
  for (const msg of session.history) {
    if (currentMsg.length > 0 && currentMsg[currentMsg.length - 1].role === msg.role) {
      currentMsg[currentMsg.length - 1].content += `\n${msg.content}`;
    } else {
      currentMsg.push({ role: msg.role, content: msg.content });
    }
  }

  let finalResponse = null;

  const tools = [
    {
      name: "request_human",
      description: "Deriva al cliente con un operador humano.",
      input_schema: { type: "object", properties: {} }
    },
    {
      name: "add_to_cart",
      description: "Agrega productos al carrito por ID y cantidad.",
      input_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "integer", description: "ID numérico del producto" },
                quantity: { type: "integer", description: "Cantidad" }
              },
              required: ["product_id", "quantity"]
            }
          }
        },
        required: ["items"]
      }
    },
    {
      name: "get_loyalty_points",
      description: "Obtiene los puntos de fidelidad del cliente.",
      input_schema: { type: "object", properties: {} }
    },
    {
      name: "confirm_order",
      description: "Confirma el carrito y pregunta por el método de entrega (retiro/despacho).",
      input_schema: { type: "object", properties: {} }
    },
    {
      name: "set_delivery",
      description: "Guarda el tipo de entrega (retiro o despacho) y la dirección si aplica.",
      input_schema: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["retiro", "despacho"] },
          address: { type: "string" },
          commune: { type: "string" }
        },
        required: ["type"]
      }
    },
    {
      name: "generate_payment",
      description: "Genera el link de pago y finaliza el pedido.",
      input_schema: { type: "object", properties: {} }
    },
    {
      name: "send_buttons",
      description: "Envía un mensaje con botones clickeables al cliente. Utiliza esto para preguntar sobre opciones cortas en un menú guiado.",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "El texto descriptivo principal (Ej: 'Selecciona una opcion:')" },
          buttons: { type: "array", items: { type: "string" }, description: "MÁXIMO 3 opciones de botones cortos" }
        },
        required: ["text", "buttons"]
      }
    },
    {
      name: "send_list",
      description: "Envía un mensaje con una lista desplegable (dropdown) nativa. Útil para enumerar categorías, varios productos o sucursales.",
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "Mensaje principal" },
          button_text: { type: "string", description: "La etiqueta del botón que abre el menú (Ej: 'Ver catálogo')" },
          items: { type: "array", items: { type: "string" }, description: "Opciones de la lista desplegable" }
        },
        required: ["text", "button_text", "items"]
      }
    }
  ];


  // Bucle para permitir que Claude llame múltiples herramientas si es necesario
  for (let i = 0; i < 5; i++) {
    const callStart = Date.now();
    const msg = await activeAnthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 400,
      system: systemPrompt,
      tools: tools,
      messages: currentMsg,
    });
    const latencyMs = Date.now() - callStart;

    logger.info({
      event: 'ai_completion',
      model: 'claude-3-5-sonnet-latest',
      latency_ms: latencyMs,
      input_tokens: msg.usage?.input_tokens || 0,
      output_tokens: msg.usage?.output_tokens || 0,
      stop_reason: msg.stop_reason,
      customer_phone: customerPhone
    }, `Claude API call finished in ${latencyMs}ms (input: ${msg.usage?.input_tokens}, output: ${msg.usage?.output_tokens})`);

    const assistantMsg = { role: 'assistant', content: msg.content };
    currentMsg.push(assistantMsg);

    
    // Extraer texto
    const textContent = msg.content.find(c => c.type === 'text')?.text;
    if (textContent) finalResponse = textContent;

    if (msg.stop_reason !== 'tool_use') {
      break;
    }

    // Ejecutar herramientas
    const toolResults = [];
    for (const contentBlock of msg.content) {
      if (contentBlock.type === 'tool_use') {
        const { id, name, input } = contentBlock;
        let toolResultText = "";

        try {
          if (name === 'request_human') {
            session.isHumanMode = true;
            session.pendingHuman = true;
            notifyHumanOperator(customerPhone, session.userData?.first_name);
            toolResultText = "Operador notificado. Avisa al usuario que será atendido pronto.";
          } 
          else if (name === 'add_to_cart') {
            const addedItems = [];
            const stockWarnings = [];

            for (const item of input.items) {
              const product = products.find(p => p.id === item.product_id);
              if (product) {
                const existing = session.cart.find(i => i.product.id === product.id);
                const currentInCart = existing ? existing.quantity : 0;
                const requestedTotal = currentInCart + item.quantity;

                if (parseFloat(product.stock) <= 0) {
                  stockWarnings.push(`El producto "${product.name}" está actualmente AGOTADO (stock: 0).`);
                } else if (requestedTotal > parseFloat(product.stock)) {
                  const maxAddable = Math.max(0, parseFloat(product.stock) - currentInCart);
                  if (maxAddable > 0) {
                    if (existing) existing.quantity += maxAddable;
                    else session.cart.push({ product, quantity: maxAddable });
                    stockWarnings.push(`Solo pudimos agregar ${maxAddable} de "${product.name}" porque es todo el stock disponible.`);
                  } else {
                    stockWarnings.push(`No se pudo agregar más de "${product.name}" porque ya tienes todo el stock disponible en tu carrito.`);
                  }
                } else {
                  if (existing) existing.quantity += item.quantity;
                  else session.cart.push({ product, quantity: item.quantity });
                  addedItems.push(`${item.quantity} x ${product.name}`);
                }
              }
            }
            toolResultText = `Productos agregados: ${addedItems.join(', ') || 'ninguno'}. ${stockWarnings.join(' ')}`;
          }
          else if (name === 'get_loyalty_points') {
            const loyalty = await getUserPoints(session.userToken);
            toolResultText = `El usuario tiene ${loyalty.points} puntos. Nivel: ${loyalty.level}.`;
          }
          else if (name === 'confirm_order') {
            session.step = 'confirming';
            toolResultText = "Pedido confirmado. Pregunta si desea retiro o despacho.";
          }
          else if (name === 'set_delivery') {
            session.deliveryType = input.type;
            if (input.type === 'despacho') {
              session.deliveryAddress = input.address || '';
              session.deliveryCommune = input.commune || '';
            }
            session.step = 'awaiting_payment';
            toolResultText = "Datos de entrega guardados. Procede a generar el pago (generate_payment).";
          }
          else if (name === 'generate_payment') {
            const order = await createOrder(session, session.deliveryType || 'retiro', session.deliveryAddress, session.deliveryCommune, session.deliveryReference);
            const link = await generatePaymentLink(order.id);
            session.cart = [];
            session.step = 'menu';
            toolResultText = `Pedido creado. Link de MercadoPago generado: ${link}. Puntos ganados: ${order.points_earned}. Entrega esta información al usuario y despídete.`;
          }
          else if (name === 'send_buttons') {
            const btns = input.buttons.slice(0, 3).map((b, idx) => ({ buttonId: 'btn_'+idx, buttonText: { displayText: b }, type: 1 }));
            await sendMessage(customerPhone, {
                text: input.text,
                buttons: btns,
                headerType: 1
            });
            toolResultText = "El usuario vio los botones y se le enviaron con éxito. Espera a que responda alguna opción.";
          }
          else if (name === 'send_list') {
            const sections = [
              {
                title: "Lista de Opciones",
                rows: input.items.map((it, idx) => ({ title: it, rowId: 'row_'+idx }))
              }
            ];
            await sendMessage(customerPhone, {
                text: input.text,
                buttonText: input.button_text,
                sections: sections
            });
            toolResultText = "El usuario recibió la lista desplegable. Espera a que seleccione una opción.";
          }
        } catch (e) {
          toolResultText = `Error al ejecutar herramienta: ${e.message}`;
        }

        toolResults.push({
          type: 'tool_result',
          tool_use_id: id,
          content: toolResultText
        });
      }
    }
    
    currentMsg.push({ role: 'user', content: toolResults });
  }

  // Guardar historial limpio
  const cleanedHistory = [];
  for (const m of currentMsg) {
    let textContent = '';
    if (Array.isArray(m.content)) {
      textContent = m.content.find(c => c.type === 'text')?.text || '';
      if (!textContent && m.role === 'assistant') textContent = '[Acción interna realizada]';
      if (!textContent && m.role === 'user') textContent = '[Resultado de acción interna]';
    } else {
      textContent = m.content || '';
    }
    
    if (textContent.trim() !== '') {
      if (cleanedHistory.length > 0 && cleanedHistory[cleanedHistory.length - 1].role === m.role) {
        cleanedHistory[cleanedHistory.length - 1].content += `\n${textContent}`;
      } else {
        cleanedHistory.push({ role: m.role, content: textContent });
      }
    }
  }

  session.history = cleanedHistory;
  return finalResponse;
}

// Wrapper para guardar siempre la sesión
async function handleMessage(phone, message) {
  const session = await getSession(phone);
  try {
    return await handleMessageLogic(phone, message, session);
  } finally {
    await saveSession(phone, session);
  }
}

// Lógica principal de mensajes
async function handleMessageLogic(phone, message, session) {
  session.lastMessageAt = new Date().toISOString();
  if (!session.messages) session.messages = [];
  session.messages.push({ sender: 'customer', text: message, timestamp: session.lastMessageAt });
  io.emit('chat_message', { phone, sender: 'customer', text: message });

  if (session.isHumanMode) {
    return null;
  }

  try {
    if (!session.userToken) {
      const auth = await authenticateWhatsAppUser(phone);
      if (auth && auth.token) {
        session.userToken = auth.token;
        session.userData = auth.user;
      } else if (auth && auth.name_required) {
        if (!session.awaitingName) {
          session.awaitingName = true;
          const welcome = `¡Hola! 👋 Bienvenid@ a *Palta con Huevo* 🥑🥚\nSoy Paltín, tu asistente virtual.\n\n¿Cuál es tu nombre para registrarte?`;
          session.messages.push({ sender: 'bot', text: welcome, timestamp: new Date().toISOString() });
          return welcome;
        } else {
          const regAuth = await authenticateWhatsAppUser(phone, message);
          if (regAuth && regAuth.token) {
            session.userToken = regAuth.token;
            session.userData = regAuth.user;
            session.awaitingName = false;
            const regSuccess = `¡Listo ${regAuth.user.first_name}! ✅ Te registré con éxito.\n\n${getMenu(session)}`;
            session.messages.push({ sender: 'bot', text: regSuccess, timestamp: new Date().toISOString() });
            return regSuccess;
          }
          session.awaitingName = false;
          return '❌ Hubo un problema al registrarte. Escribe *hola* para intentar de nuevo.';
        }
      } else {
        session.awaitingName = false;
        return '❌ Error de comunicación con el sistema. Escribe *hola* para intentar de nuevo.';
      }
    }

    const lower = message.toLowerCase().trim();
    if (['humano', 'operador', 'persona', 'agente real', 'atencion humana', 'soporte'].includes(lower)) {
      session.isHumanMode = true;
      session.pendingHuman = true;
      notifyHumanOperator(phone, session.userData?.first_name);
      const transferMsg = '👨‍💼 Te transfiero de inmediato con un operador humano. Un momento por favor, te responderemos pronto.';
      session.messages.push({ sender: 'bot', text: transferMsg, timestamp: new Date().toISOString() });
      return transferMsg;
    }

    if (['hola','inicio','menu','menú','0'].includes(lower)) {
      logger.info({ event: 'heuristic_short_circuit', intent: 'menu', phone }, 'Respondiendo menú por heurística');
      const menuText = getMenu(session);
      session.messages.push({ sender: 'bot', text: menuText, timestamp: new Date().toISOString() });
      return menuText;
    }

    const botReply = await processWithAI(session, message, phone);

    if (botReply) {
      session.messages.push({ sender: 'bot', text: botReply, timestamp: new Date().toISOString() });
      io.emit('chat_message', { phone, sender: 'bot', text: botReply });
    }
    return botReply;

  } catch (error) {
    console.error('Error:', error.message);
    return '❌ Tuve un problema. Intenta de nuevo o escribe "menu" para volver al inicio.';
  }
}

function getMenu(session) {
  const name = session?.userData?.first_name || '';
  const greeting = name ? `¡Hola ${name}! 👋 Bienvenid@ nuevamente a *Palta con Huevo* 🥑🥚` : `¡Hola! 👋 Bienvenid@ a *Palta con Huevo* 🥑🥚`;
  return `${greeting}\n\nSoy Paltín, tu asistente.\n\n📦 *Quiero pedir*\n⭐ *Mis puntos*\n🍳 *Recetas*\n🎁 *Ofertas*\n👨‍💼 *Hablar con humano*\n\n¡Dime tu opción para comenzar!`;
}

// Endpoints API para administración de WhatsApp
app.get('/api/wa/chats', async (req, res) => {
  try {
    const resApi = await api.get('/marketing/sessions/');
    const dbSessions = resApi.data || [];
    const chatList = dbSessions.map(dbS => {
      const phone = dbS.phone;
      const session = dbS.session_data;
      return {
        phone,
        name: session.userData?.first_name ? `${session.userData.first_name} ${session.userData.last_name || ''}`.trim() : (session.pushName || phone),
        isHumanMode: !!session.isHumanMode,
        pendingHuman: !!session.pendingHuman,
        lastMessageAt: session.lastMessageAt || new Date().toISOString(),
        messagesCount: session.messages ? session.messages.length : 0,
      };
    });
    chatList.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
    res.json(chatList);
  } catch (e) {
    res.status(500).json({ error: 'Error fetching sessions' });
  }
});

app.get('/api/wa/chats/:phone/messages', async (req, res) => {
  const { phone } = req.params;
  const session = await getSession(phone);
  res.json({
    phone,
    name: session.userData?.first_name ? `${session.userData.first_name} ${session.userData.last_name || ''}`.trim() : (session.pushName || phone),
    isHumanMode: !!session.isHumanMode,
    pendingHuman: !!session.pendingHuman,
    messages: session.messages || []
  });
});

app.post('/api/wa/chats/:phone/reply', async (req, res) => {
  const { phone } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mensaje requerido' });

  const session = await getSession(phone);
  session.isHumanMode = true;
  session.pendingHuman = false;
  session.lastMessageAt = new Date().toISOString();
  if (!session.messages) session.messages = [];
  session.messages.push({ sender: 'operator', text: message, timestamp: session.lastMessageAt });

  await saveSession(phone, session);
  await sendMessage(phone, message);
  io.emit('chat_message', { phone, sender: 'operator', text: message });
  res.json({ success: true });
});

app.post('/api/wa/chats/:phone/toggle-human', async (req, res) => {
  const { phone } = req.params;
  const { isHumanMode } = req.body;
  const session = await getSession(phone);
  session.isHumanMode = !!isHumanMode;
  if (!isHumanMode) session.pendingHuman = false;
  await saveSession(phone, session);
  io.emit('chats_updated');
  res.json({ phone, isHumanMode: session.isHumanMode });
});

app.post('/send', (req, res) => {
  const { to, message } = req.body;
  const token = req.headers.authorization?.replace('Bearer ', '');
  const expectedToken = process.env.INTERNAL_TOKEN || '';
  if (token !== expectedToken) return res.status(401).json({ error: 'Unauthorized' });
  sendMessage(to, message);
  res.json({ sent: true });
});

app.get('/health', (req, res) => res.json({ status: 'ok', connected: isConnected }));
app.get('/api/wa/status', (req, res) => res.json({ connected: isConnected, has_qr: !!currentQR }));
app.get('/api/wa/qr', (req, res) => res.json({ qr: currentQR }));
app.post('/api/wa/pairing-code', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Debes ingresar un número de teléfono.' });
    }
    if (!waSocket) {
      return res.status(500).json({ error: 'El agente de WhatsApp no se ha inicializado todavía.' });
    }
    if (isConnected) {
      return res.status(400).json({ error: 'WhatsApp ya está conectado.' });
    }

    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 9 && cleanPhone.startsWith('9')) {
      cleanPhone = '56' + cleanPhone;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      return res.status(400).json({ error: 'Número no válido. Debe incluir código de país (ej: 56912345678).' });
    }

    const code = await waSocket.requestPairingCode(cleanPhone);
    const formattedCode = code ? (code.includes('-') ? code : code.match(/.{1,4}/g)?.join('-') || code) : code;

    res.json({ code: formattedCode, phone: cleanPhone });
  } catch (error) {
    console.error('Error al generar código de vinculación por número:', error);
    res.status(500).json({ error: error.message || 'Error al solicitar el código de vinculación a WhatsApp.' });
  }
});
let isInitializing = false;

function safeRemoveAuthInfo() {
  if (fs.existsSync('auth_info')) {
    try {
      const files = fs.readdirSync('auth_info');
      for (const file of files) {
        fs.rmSync(`auth_info/${file}`, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
      }
      console.log('🗑️ Contenido de auth_info borrado con éxito');
    } catch (e) {
      console.error('⚠️ No se pudo vaciar auth_info:', e.message);
    }
  }
}

app.post('/api/wa/logout', async (req, res) => {
  try {
    console.log('🚪 Solicitando desvinculación manual de WhatsApp...');
    isConnected = false;
    currentQR = null;
    isInitializing = false;
    sessions.clear();

    if (waSocket) {
      const sock = waSocket;
      waSocket = null;
      try {
        await sock.logout();
      } catch (e) {}
      try {
        sock.end(undefined);
      } catch (e) {}
    }

    safeRemoveAuthInfo();

    setTimeout(() => {
      startWhatsApp();
    }, 1000);

    res.json({ success: true });
  } catch (e) {
    console.error('Error en /api/wa/logout:', e);
    res.status(500).json({ error: 'Error al desvincular WhatsApp' });
  }
});

// Iniciar Baileys
async function startWhatsApp() {
  if (isInitializing) {
    console.log('⏳ Ya hay un proceso de inicialización de WhatsApp en curso...');
    return;
  }
  isInitializing = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
    console.log(`🔄 Iniciando socket de WhatsApp (Baileys v${version.join('.')})...`);

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ['PaltaConHuevo', 'Chrome', '1.0.0']
    });
    waSocket = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('📱 ¡Código QR generado con éxito!');
        qrcode.generate(qr, { small: true });
        currentQR = qr;
        isConnected = false;
      }

      if (connection === 'close') {
        isConnected = false;
        waSocket = null;
        isInitializing = false;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        console.log(`🔌 Conexión de WhatsApp cerrada (statusCode: ${statusCode})`);

        const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;

        if (isLoggedOut) {
          console.log('Cierre de sesión detectado. Borrando auth_info y generando nuevo QR...');
          currentQR = null;
          safeRemoveAuthInfo();
          setTimeout(() => {
            startWhatsApp();
          }, 1000);
        } else {
          console.log('Reconectando WhatsApp en 4s...');
          setTimeout(() => {
            startWhatsApp();
          }, 4000);
        }
      }

      if (connection === 'open') {
        console.log('✅ ¡WhatsApp conectado exitosamente!');
        isConnected = true;
        currentQR = null;
        isInitializing = false;
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const remoteJid = msg.key.remoteJid || '';
        if (remoteJid.includes('@g.us')) continue; // Ignorar grupos

        let realJid = remoteJid;
        if (remoteJid.endsWith('@lid')) {
          if (msg.key.remoteJidAlt && msg.key.remoteJidAlt.endsWith('@s.whatsapp.net')) {
            realJid = msg.key.remoteJidAlt;
          } else if (msg.key.participant && msg.key.participant.endsWith('@s.whatsapp.net')) {
            realJid = msg.key.participant;
          }
        }

        const rawPhone = realJid.replace('@s.whatsapp.net', '').replace('@lid', '').replace('@g.us', '');
        const phone = formatPhone(rawPhone);
        
        let text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        
        // Interpretar respuesta a Botones o Listas si existen:
        if (msg.message.buttonsResponseMessage) {
           text = msg.message.buttonsResponseMessage.selectedDisplayText;
        } else if (msg.message.listResponseMessage) {
           text = msg.message.listResponseMessage.title;
        }
        
        if (!text) continue;

        const session = await getSession(phone);
        session.remoteJid = realJid;
        if (msg.pushName) session.pushName = msg.pushName;
        await saveSession(phone, session);

        console.log(`📩 ${phone} (${msg.pushName || 'Sin nombre'}): ${text}`);
        const response = await handleMessage(phone, text);
        if (response) await sendMessage(phone, response);
      }
    });

  } catch (e) {
    console.error('❌ Error fatal iniciando WhatsApp:', e);
    waSocket = null;
    isInitializing = false;
    setTimeout(() => {
      startWhatsApp();
    }, 5000);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`🚀 WhatsApp Agent corriendo en puerto ${PORT}`));
startWhatsApp();

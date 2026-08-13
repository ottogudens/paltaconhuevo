# Auditoría Técnica Completa — Palta con Huevo
**Repositorio:** `ottogudens/paltaconhuevo` | **Stack:** Django REST Framework + React/Vite + Node.js (Baileys) + PostgreSQL + Railway
**Fecha:** Agosto 2026

---

## Resumen ejecutivo

El proyecto tiene una arquitectura razonable (3 servicios separados: backend, frontend, agente WhatsApp) y funcionalidad de negocio bien pensada (fidelización, marketing, finanzas, agente IA). Sin embargo, la auditoría encontró **una falla crítica sistémica de autorización** que afecta prácticamente toda la API, más varios problemas de seguridad, escalabilidad y eficiencia de IA que deben resolverse antes de operar con clientes reales y dinero real (MercadoPago).

**Veredicto:** apto como MVP funcional, **no apto para producción con datos financieros reales** sin resolver los hallazgos Críticos.

| Severidad | Cantidad |
|---|---|
| 🔴 Crítica | 4 |
| 🟠 Alta | 6 |
| 🟡 Media | 7 |
| 🔵 Baja / mejora | 5 |

---

## 🔴 Hallazgos críticos

### C1. No existe control de acceso por rol (RBAC) a nivel de API — el más grave
El modelo `User` define roles (`admin`, `vendedor`, `cliente`), y el **frontend** los respeta (`ProtectedRoute requiredRole="admin"` en `App.jsx`). Pero esa protección es **solo cosmética**: vive en el cliente y no en el servidor.

Revisé cada `views.py` del backend y casi ninguna vista declara `permission_classes` propio; todas heredan el default global:
```python
'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.IsAuthenticated']
```
Es decir: **cualquier usuario autenticado — incluyendo un cliente que se registró solo mandando un WhatsApp — puede leer y modificar**:
- `TransactionListCreateView` / `TransactionDetailView` (finanzas: ingresos, egresos, márgenes del negocio)
- `CampaignListCreateView`, `AgentConfig` (marketing, y el system prompt del bot)
- `ProductListCreateView` / `ProductDetailView` (precios de venta y costo, stock)
- `OrderDetailView` (puede ver/editar **el pedido de cualquier otro cliente** por ID)
- `DashboardView`, `ExportOrdersView`, `ExportCustomersView` (ventas totales, cuentas por cobrar, exportar la base completa de clientes)
- `CustomerListView` / `SystemUserListView` (listar y editar **incluso las cuentas admin**)

Un atacante solo necesita: registrarse por WhatsApp (gratis, sin verificación real) → usar el token recibido → llamar directamente a `/api/finance/transactions/`, `/api/orders/1/`, `/api/users/users/`, etc.

**Impacto:** fuga total de datos financieros y de clientes, manipulación de pedidos ajenos, modificación de precios/stock, posible escalación a cuenta admin.

**Solución:** crear clases de permiso reutilizables (`IsAdmin`, `IsAdminOrVendedor`, `IsOwnerOrStaff`) y aplicarlas explícitamente en **cada** vista. Nunca confiar en que el frontend oculte un botón.

### C2. Toma de cuenta sin verificación vía `/auth/whatsapp/`
`WhatsAppAuthView` es `AllowAny` y entrega un **token de sesión completo** con solo enviar `{"phone": "<número de la víctima>"}` — no valida que quien llama sea realmente dueño de ese WhatsApp (eso normalmente lo garantiza Baileys al recibir el mensaje, pero el endpoint Django es un servicio HTTP público independiente, invocable por cualquiera que conozca la URL y el número).

Además, cuando se crea el usuario: `user.set_password(phone)` — **la contraseña inicial es el propio número de teléfono**, un dato semi-público.

**Solución:** el endpoint `/auth/whatsapp/` no debería ser público; debe protegerse con un secreto compartido entre el agente Node y Django (`WHATSAPP_SERVICE_TOKEN` — ya existe en settings.py pero **no se usa** en ninguna vista, confirmé que no aparece referenciado en `users/views.py`). Adicionalmente, generar contraseñas aleatorias, no derivadas de datos conocidos.

### C3. Reseteo de contraseña sin verificación (`PasswordResetView`)
Con solo el email o teléfono (dato conocido/adivinable) y un `new_password` de 4+ caracteres, cualquiera puede tomar control de **cualquier cuenta, incluidas las de admin**, sin OTP, sin email de confirmación, sin token temporal.

**Solución:** flujo estándar de reset con token de un solo uso enviado por email/SMS (ya tienen SendGrid integrado), expiración corta, y nunca resolver el reset en una sola llamada sin verificación intermedia.

### C4. Configuración Django insegura por defecto
En `settings.py`:
- `DEBUG = os.getenv('DEBUG', 'True') == 'True'` → si la variable de entorno no está seteada en algún ambiente, **el default es `True`** (expone stack traces, SQL, rutas del servidor).
- `SECRET_KEY` con fallback inseguro hardcodeado si falta la env var.
- `ALLOWED_HOSTS` default `'*'`.
- `CORS_ALLOW_ALL_ORIGINS = True` permanente (el comentario dice "for now" pero no hay plan de cerrarlo).
- No hay `SECURE_SSL_REDIRECT`, `SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`, `SECURE_HSTS_SECONDS`.
- No hay throttling (`DEFAULT_THROTTLE_CLASSES`) — la API es vulnerable a fuerza bruta y abuso masivo, especialmente grave combinado con C2 y C3.

**Solución:** hardening estándar de Django para producción (ver plan de acción).

---

## 🟠 Hallazgos de severidad alta

### A1. Baileys = WhatsApp no oficial (riesgo de negocio, no solo técnico)
El agente usa `@whiskeysockets/baileys`, que emula WhatsApp Web sin usar la API oficial de Meta. Esto viola los Términos de Servicio de WhatsApp y **el número puede ser baneado sin previo aviso**, especialmente en un caso de uso comercial con envío de notificaciones y venta. Para un negocio real que dependerá de este canal para vender, es un riesgo existencial.

**Solución:** migrar a **WhatsApp Business Cloud API (Meta)** o a **Twilio** (ya tienes experiencia con Twilio según tus otros proyectos). Cuesta dinero por conversación, pero es estable, soportado y no depende de mantener una sesión web viva con reconexiones constantes.

### A2. Estado del agente 100% en memoria (`Map()` de Node)
`sessions`, carritos, historial de conversación, modo humano/bot — todo vive en `const sessions = new Map()`. Railway puede reiniciar el contenedor por deploys, OOM, o simplemente inactividad:
- Se pierde el carrito de un cliente a mitad de compra.
- Se pierde el estado "modo humano" (un cliente derivado a un operador podría volver a recibir respuestas del bot tras un restart).
- Con muchos usuarios activos, la memoria del proceso crece sin límite (no hay expiración de sesiones inactivas) → memory leak.
- No es posible escalar horizontalmente (2 instancias = 2 mapas de sesión distintos, un usuario podría "rebotar" entre instancias).

**Solución:** mover el estado de sesión a Redis o a la propia base de datos Postgres (ya existe). Railway ofrece Redis como plugin fácil de añadir.

### A3. Doble llamada a la IA por mensaje + sin caché de catálogo
Cada mensaje entrante llama a `getProducts()` y `getAgentConfig()` **vía HTTP a Django antes de cada respuesta de IA**, y luego hace una llamada a Claude con el catálogo completo embebido en el system prompt. Para un catálogo que cambia poco (paltas, huevos), esto:
- Añade latencia (2 llamadas HTTP + 1 llamada a Anthropic, en serie) en cada turno.
- Gasta tokens de system prompt repitiendo el mismo catálogo en cada mensaje.
- No usa function calling / tool use de Claude (que sería más robusto que pedirle al modelo que devuelva strings mágicos como `[CONFIRMAR_PEDIDO]`).

**Solución:**
- Cachear catálogo y `AgentConfig` en memoria del proceso Node con invalidación por webhook o TTL de 1-5 min.
- Migrar de "comandos mágicos en texto libre" a **tool use nativo de la API de Anthropic** (`tools` parameter): la IA invoca `confirmar_pedido()`, `generar_pago()`, `derivar_humano()` como funciones estructuradas, eliminando el parsing frágil con `.includes('[CONFIRMAR_PEDIDO]')` y regex.

### A4. Matching de productos en el carrito por regex frágil
```js
const regex = new RegExp(`(\\d+)\\s*(${product.name}|${product.product_type})`, 'i');
```
Solo detecta dígitos arábigos ("2 paltas"), no números en palabras ("dos paltas", muy común en WhatsApp real), no maneja unidades ("una docena de huevos" mencionado en el propio README como ejemplo no lo captura el regex), y puede producir falsos positivos con nombres de producto cortos que matcheen substrings de otras palabras.

**Solución:** delegar la extracción de ítems del pedido a **tool use estructurado de Claude** (el modelo devuelve JSON validado `{producto_id, cantidad}` en vez de texto libre que hay que parsear con regex).

### A5. Modelo de precio/costo del pedido con bug potencial
```python
unit_cost=float(product.purchases.last().unit_cost) if product.purchases.exists() else 0
```
`.last()` sin un `ordering` explícito en el `Meta` del modelo `Purchase` no garantiza la compra más reciente cronológicamente — en Django, sin `order_by`, el orden es indefinido (depende del PK en la práctica, pero no está garantizado). Si esto alimenta el cálculo de margen en `finance`, los reportes de rentabilidad podrían estar mal.

**Solución:** usar `product.purchases.order_by('-purchase_date').first()` explícito, o mantener un campo `current_cost` en `Product` actualizado en cada compra.

### A6. Import/Export de clientes en Excel sin control de tamaño ni saneamiento
`ImportCustomersView` asigna `set_password('paltaconhuevo2024')` (contraseña **fija e igual para todos los clientes importados**, predecible) y no valida tipos de fila más allá de un `try/except` genérico. Cualquier admin comprometido (dado C1, esto podría ser cualquier usuario) puede además descargar el Excel completo de clientes con teléfono y dirección.

---

## 🟡 Hallazgos de severidad media

1. **Sin tests reales de negocio**: `users/tests.py` existe pero no vi suite de tests para `orders`, `finance`, `marketing` — con lógica de dinero (puntos, márgenes, MercadoPago) sin cobertura, cualquier refactor es riesgoso.
2. **Sin migraciones versionadas visibles más allá de `0001_initial`** en varias apps — revisar que el esquema en Railway esté sincronizado con el repo.
3. **`anthropic==0.25.8`** en requirements.txt es un SDK antiguo; conviene actualizar a una versión reciente (mejoras de streaming, tool use, manejo de errores).
4. **Sin manejo de reintentos/backoff** en las llamadas a la API de Anthropic ni a MercadoPago — un timeout deja al usuario sin respuesta y sin mensaje de error claro más allá del catch genérico.
5. **`session.history` limitado a 20 mensajes** sin resumen — está bien como control de costo, pero conversaciones largas pierden contexto de golpe en vez de resumirse.
6. **Falta de logging estructurado / observabilidad** en el agente WhatsApp: solo `console.log`, sin correlación de eventos, sin métricas de latencia de IA ni tasa de derivación a humano — importante para optimizar recursos de IA (tu área de interés).
7. **Sin idempotencia en el webhook de MercadoPago** (`MercadoPagoWebhookView`): si Mercado Pago reintenta la notificación, no hay chequeo de que el pago ya fue procesado antes de volver a actualizarlo (riesgo bajo aquí, pero mala práctica).

---

## 🔵 Mejoras menores / UI-UX

- El frontend no evidencia diseño mobile-first dedicado más allá de Tailwind por defecto — dado que gran parte de la operación (clientes) ocurre 100% en WhatsApp, el panel admin debería priorizarse para tablet/desktop, pero **el flujo de compra del cliente en WhatsApp es la verdadera "UI" del negocio** y merece más pulido conversacional (confirmaciones más claras, botones de lista/WhatsApp Interactive Messages si migran a Cloud API).
- No vi manejo de estados de carga/error consistente revisando rápidamente `services/api.js` — vale la pena un interceptor centralizado de Axios para refresco de sesión y mensajes de error uniformes.
- Falta favicon/PWA/manifest para experiencia "app-like" en móvil si el panel también lo usan vendedores desde el celular.

---

## Plan de mejora propuesto (fases)

### Fase 0 — Contención inmediata (1-2 días, antes de seguir usando el sistema con datos reales)
1. Añadir `permission_classes` explícitas a **todas** las vistas (C1). Crear `core/permissions.py` con `IsAdmin`, `IsAdminOrVendedor`, `IsOwner`.
2. Proteger `/auth/whatsapp/` con el `WHATSAPP_SERVICE_TOKEN` que ya existe en settings pero no se usa (C2).
3. Reescribir `PasswordResetView` con flujo de token temporal por email/SMS (C3).
4. Fijar `DEBUG=False` explícito en Railway, `CORS_ALLOW_ALL_ORIGINS=False` con whitelist real, agregar `SECURE_*` settings y throttling (C4).

### Fase 1 — Robustecer el agente WhatsApp (1 semana)
5. Mover sesiones a Redis (o Postgres) — persistencia y escalabilidad (A2).
6. Migrar la lógica de comandos mágicos a **tool use nativo de Claude** — resuelve A3 y A4 de una sola vez, y deja el sistema mucho más mantenible.
7. Evaluar migración a WhatsApp Cloud API/Twilio antes de escalar el volumen de clientes (A1) — puedo ayudarte a diseñar esa migración manteniendo la misma lógica de negocio.

### Fase 2 — Confiabilidad de datos financieros (3-5 días)
8. Corregir cálculo de costo unitario con `order_by` explícito (A5).
9. Añadir tests de integración para `orders`, `finance`, `loyalty` (flujos de dinero).
10. Idempotencia en webhook de MercadoPago.

### Fase 3 — Observabilidad y optimización de costos de IA (continuo)
11. Logging estructurado (JSON) con latencia por llamada a Claude, tokens usados, tasa de derivación a humano.
12. Cacheo de catálogo/config con TTL para reducir llamadas HTTP internas por mensaje.
13. Revisar si conviene un modelo más económico para intents simples (menú, saludo) y reservar Sonnet para conversación compleja — enrutamiento por heurística antes de llamar al LLM.

### Fase 4 — UI/UX
14. Interceptor Axios centralizado, manejo consistente de loading/error.
15. Mejorar mensajes/flujo conversacional del bot (confirmaciones, manejo de errores de stock en lenguaje natural).

---

¿Quieres que empecemos por la **Fase 0** ahora mismo? Puedo escribir directamente las clases de permisos y aplicarlas vista por vista — es la parte que más urge dado que hay dinero real (MercadoPago) y datos de clientes en juego.

# The Dream Gift — API Spec para el Ecommerce

> Documento para el desarrollador del ecommerce externo.  
> Fecha: 10 de marzo de 2026  
> Versión: 1.0

---

## Contexto

La plataforma de agentes AI gestiona conversaciones de WhatsApp. Cuando un cliente quiere comprar una lámpara personalizada, el agente de chat llama a los endpoints de este documento para procesar pagos, generar diseños y crear pedidos.

La comunicación funciona en ambas direcciones:
- **Plataforma → Ecommerce** (requests de tools): pagos, diseños, pedidos
- **Ecommerce → Plataforma** (callbacks): cuando una operación asíncrona termina

---

## Autenticación

Todos los endpoints de ecommerce requieren:
```
Authorization: Bearer {API_KEY}
```
Generar un API key y compartirlo con el equipo de la plataforma.

---

## Base URL

```
https://api.thedreamgiftmx.com
```

---

## 1. Pagos (Mercado Pago)

### Crear link de pago
```
POST /api/payments/link
```

**Request:**
```json
{
  "amount": 100,
  "concept": "Apartado The Dream Gift",
  "order_ref": "TDG-5215551234-1741600000",
  "expiration_hours": 24,
  "whatsapp_phone": "5215551234",
  "_session_id": "sess_abc123",
  "_channel_id": "ch_xyz"
}
```

> Los campos `_session_id`, `_channel_id`, `whatsapp_phone` son inyectados automáticamente por la plataforma. `_session_id` y `_channel_id` se usan para construir el `callback_url`; `whatsapp_phone` asocia el número del cliente al registro.

> El campo `order_ref` lo genera el agente con el formato `TDG-{phone}-{unix_timestamp}` (ej. `TDG-5215551234-1741600000`).

**Valores de `amount` esperados:**
| Caso | Monto |
|------|-------|
| Apartado (primera parte) | 100 |
| Pago total lámpara LED | 597 |
| Pago total lámpara madera | 719 |
| Saldo lámpara LED (después de apartado) | 497 |
| Saldo lámpara madera (después de apartado) | 619 |

**Response 201:**
```json
{
  "payment_id": "pay_abc123",
  "payment_url": "https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=xxx",
  "expires_at": "2026-03-11T18:00:00Z"
}
```

**Response 422:**
```json
{ "error": "invalid_amount", "message": "El monto mínimo es $10 MXN" }
```

---

### Consultar estado de pago
```
GET /api/payments?payment_id={payment_id}
```

**Response 200:**
```json
{
  "payment_id": "pay_abc123",
  "status": "pending",
  "amount": 100,
  "paid_at": null
}
```

**Valores de `status`:** `pending` | `pending_verification` | `approved` | `rejected` | `expired`

| Status | Significado |
|--------|-------------|
| `pending` | Link MP creado, esperando pago |
| `pending_verification` | Comprobante de transferencia recibido, esperando revisión admin |
| `approved` | Pago confirmado |
| `rejected` | Pago rechazado (transferencia no válida) |
| `expired` | Link MP expirado sin pagar |

---

### Registrar comprobante de transferencia
```
POST /api/payments/transfer
```

**Request:**
```json
{
  "amount": 100,
  "concept": "Apartado The Dream Gift",
  "order_ref": "TDG-5215551234-1741600000",
  "proof_url": "https://sales-agent-ai.s3.amazonaws.com/whatsapp/media/ch_xyz/comprobante.jpg",
  "whatsapp_phone": "5215551234",
  "_session_id": "sess_abc123",
  "_channel_id": "ch_xyz"
}
```

**Response 201:**
```json
{
  "payment_id": "pay_abc123",
  "status": "pending_verification",
  "message": "Comprobante recibido. Un administrador verificará el pago pronto."
}
```

> El pago queda en `pending_verification` hasta que un administrador lo apruebe o rechace desde el panel de administración (`GET /api/admin/payments/pending-transfers` y `POST /api/admin/payments/{id}/review`). Si se aprueba, se dispara el `callback_url` exactamente igual que con un pago de MercadoPago.

---

## 2. Diseños

> El diseño consiste en **vectorizar la foto del cliente**: se convierte a blanco con solo los trazos para corte láser. Para generarlo **únicamente se necesita la foto** — no se requiere texto, nombre ni ningún dato adicional.

### Solicitar generación de diseño
```
POST /api/designs
```

**Request:**
```json
{
  "photo_url": "https://sales-agent-ai.s3.amazonaws.com/whatsapp/media/ch_xyz/msg_abc.jpg",
  "product_id": "rgb",
  "whatsapp_phone": "5215551234",
  "_session_id": "sess_abc123",
  "_channel_id": "ch_xyz"
}
```

**Valores de `product_id`:** `rgb` | `madera`

**Response 202 — Aceptado, procesando:**
```json
{
  "job_id": "dsn_abc123",
  "estimated_seconds": 30
}
```

**Response 422:**
```json
{ "error": "invalid_photo_url", "message": "No se pudo descargar la foto" }
```

**Importante:** Cuando el diseño esté listo, el ecommerce debe llamar al webhook de la plataforma (ver sección 5). El `_session_id` y `_channel_id` son los identificadores que el ecommerce necesita para construir la URL del callback.

---

### Consultar estado de diseño (opcional, para polling)
```
GET /api/designs?job_id={job_id}
```

**Response 200:**
```json
{
  "job_id": "dsn_abc123",
  "status": "processing",
  "design_url": null,
  "iteration": 1,
  "error_message": null
}
```

**Valores de `status`:** `processing` | `ready` | `failed`

---

### Aprobar diseño
```
POST /api/designs/approve
```

**Request:**
```json
{ "job_id": "dsn_abc123" }
```

**Response 200:**
```json
{ "approved": true }
```

---

### Solicitar revisión del diseño
```
POST /api/designs/revision
```

**Request:**
```json
{
  "job_id": "dsn_abc123",
  "change_notes": "El recorte quedó muy al borde, centra más la cara"
}
```

**Response 202:**
```json
{
  "job_id": "dsn_abc124",
  "estimated_seconds": 30
}
```

> El nuevo `job_id` es un ID distinto. Cuando el diseño revisado esté listo, el ecommerce debe llamar al webhook de la plataforma con este nuevo `job_id`.

---

## 3. Pedidos

El pedido se crea en cuanto el cliente confirma un pago, sea apartado o total. Esto permite tener trazabilidad desde el inicio del proceso.

**Ciclo de vida de un pedido:**
```
apartado → en_produccion → enviado → entregado
```
- **`apartado`**: el cliente pagó el depósito ($100). El diseño debe estar aprobado antes de pasar a producción.
- **`en_produccion`**: pago completo confirmado. La lámpara está siendo fabricada.
- **`enviado`**: entregado a paquetería.
- **`entregado`**: recibido por el cliente.
- **`cancelado`**: pedido cancelado.

> El pedido se crea con solo el pago inicial y el teléfono. El resto de los datos se completa con `PATCH /api/orders` y se confirma con `POST /api/orders/confirm`.

### Crear pedido (registro inicial)
```
POST /api/orders
```

**Request:**
```json
{
  "payment_id": "pay_abc123",
  "whatsapp_phone": "5215551234"
}
```

**Response 201:**
```json
{
  "order_id": "ord_xyz789",
  "order_number": "TDG-2026-0042",
  "status": "apartado"
}
```

**Response 422:**
```json
{ "error": "payment_not_approved", "message": "El pago no está confirmado" }
```

---

### Consultar estado del pedido
```
GET /api/orders?order_id={order_id}
```

Devuelve todos los datos actuales del pedido, incluyendo `missing_fields` (campos obligatorios vacíos) y `ready_to_confirm` (booleano). Útil para que el agente sepa qué le falta recopilar.

**Response 200:**
```json
{
  "order_id": "ord_xyz789",
  "order_number": "TDG-2026-0042",
  "status": "apartado",
  "whatsapp_phone": "5215551234",
  "product_id": "rgb",
  "product_name": "Lámpara LED 16 colores",
  "design_job_id": "dsn_abc123",
  "payment_id": "pay_abc123",
  "balance_payment_id": null,
  "full_name": "María García López",
  "address": null,
  "city": null,
  "state": null,
  "zip_code": null,
  "email": null,
  "engraving_text": null,
  "spotify_url": null,
  "missing_fields": ["address", "city", "state", "zip_code"],
  "ready_to_confirm": false,
  "created_at": "2026-03-10T12:00:00Z",
  "updated_at": "2026-03-10T12:05:00Z"
}
```

**Response 404:**
```json
{ "error": "order_not_found", "message": "El pedido no existe" }
```

---

### Actualizar datos del pedido
```
PATCH /api/orders
```

Permite ir rellenando los datos del pedido de forma incremental. Solo `order_id` es obligatorio; todos los demás campos son opcionales. Para registrar el pago del saldo, incluir `balance_payment_id`.

**Request (ejemplo completo):**
```json
{
  "order_id": "ord_xyz789",
  "product_id": "rgb",
  "design_job_id": "dsn_abc123",
  "balance_payment_id": "pay_saldo_456",
  "full_name": "María García López",
  "address": "Av. Insurgentes 123 Int 4",
  "city": "Ciudad de México",
  "state": "CDMX",
  "zip_code": "03100",
  "engraving_text": "Para siempre juntos",
  "spotify_url": "Ed Sheeran - Perfect",
  "email": "maria@ejemplo.com"
}
```

**Response 200:**
```json
{
  "order_id": "ord_xyz789",
  "updated": ["product_id", "product_name", "design_job_id", "customer_name", "updated_at"]
}
```

---

### Confirmar pedido (apartado → en producción)
```
POST /api/orders/confirm
```

Verifica que el pedido tenga toda la información requerida y pasa a producción. El ecommerce valida internamente: `product_id`, `design_job_id` (diseño aprobado), nombre, dirección completa, pago inicial aprobado y (si existe) saldo aprobado.

**Request:**
```json
{
  "order_id": "ord_xyz789"
}
```

**Response 200:**
```json
{
  "order_id": "ord_xyz789",
  "order_number": "TDG-2026-0042",
  "status": "en_produccion",
  "estimated_production_days": 2,
  "estimated_delivery_days": "2-5"
}
```

**Response 422:**
```json
{ "error": "incomplete_order", "missing_fields": ["zip_code", "street"], "message": "Faltan datos: zip_code, street" }
{ "error": "design_not_approved", "message": "El diseño no ha sido aprobado" }
{ "error": "payment_not_approved", "message": "El pago inicial no está confirmado" }
{ "error": "balance_not_approved", "message": "El pago del saldo no está confirmado" }
{ "error": "already_confirmed", "message": "El pedido ya fue confirmado" }
```

**Valores de `status`:** `apartado` | `en_produccion` | `enviado` | `entregado` | `cancelado`

---

### Consultar pedidos por teléfono (WhatsApp)
```
GET /api/orders/by-whatsapp?whatsapp_phone={whatsapp_phone}
```

Consulta por el número de WhatsApp del cliente (`whatsapp_phone`). La plataforma puede resolver `{whatsapp_phone}` en el query param automáticamente.

**Response 200:**
```json
{
  "orders": [
    {
      "order_id": "ord_xyz789",
      "order_number": "TDG-2026-0042",
      "status": "enviado",
      "created_at": "2026-03-10T12:00:00Z",
      "product_name": "Lámpara LED 16 colores",
      "tracking_number": "1Z999AA10123456784",
      "carrier": "DHL",
      "tracking_url": "https://www.dhl.com/mx-es/home/rastreo.html?tracking-id=xxx",
      "estimated_delivery": "2026-03-14"
    }
  ]
}
```

Si no hay pedidos, devolver `{ "orders": [] }`.

---

## 4. Manejo de errores

Para todos los endpoints, en caso de error:

| HTTP status | Cuándo usarlo |
|-------------|---------------|
| `400` | Request malformado |
| `401` | API key inválida o faltante |
| `404` | Recurso no encontrado |
| `422` | Validación de negocio fallida (payment_id inválido, design no aprobado, etc.) |
| `500` | Error interno del ecommerce |

Para errores 422, incluir siempre `error` (código de máquina) y `message` (texto legible):
```json
{ "error": "payment_not_approved", "message": "El pago no está confirmado" }
```

---

## 5. Callback: operaciones asíncronas

Cuando el diseño (o cualquier operación larga) termine, el ecommerce debe notificar a la plataforma.

### URL del callback

```
POST https://{PLATAFORMA_BASE_URL}/whatsapp/webhooks/async/{channel_id}/{session_id}
```

Los valores de `channel_id` y `session_id` vienen de los campos `_channel_id` y `_session_id` que la plataforma inyectó en el request original de `POST /api/designs`.

### Header de autenticación

```
X-Webhook-Secret: {WEBHOOK_SECRET}
```

El secreto será proporcionado por el equipo de la plataforma (configurado en el canal de WhatsApp).

---

### Diseño listo (success)

```json
POST /whatsapp/webhooks/async/{channel_id}/{session_id}
X-Webhook-Secret: whsec_...

{
  "status": "ready",
  "message_to_client": {
    "type": "multi",
    "messages": [
      {
        "type": "image",
        "url": "https://cdn.thedreamgiftmx.com/designs/dsn_abc123.jpg",
        "caption": "Tu diseño personalizado 🎨"
      },
      {
        "type": "text",
        "body": "¿Qué te parece? Responde *sí, me gusta* para confirmarlo\no dime qué quisieras cambiar."
      }
    ]
  },
  "context_for_agent": {
    "design_job_id": "dsn_abc123",
    "design_url": "https://cdn.thedreamgiftmx.com/designs/dsn_abc123.jpg",
    "design_status": "awaiting_approval"
  }
}
```

> `context_for_agent` es opcional pero recomendado. La plataforma lo inyecta en el historial de conversación para que el agente sepa el `job_id` cuando el cliente responda — sin necesidad de que el cliente lo repita.

### Diseño fallido

```json
{
  "status": "failed",
  "error_message": "No pudimos generar tu diseño. Nuestro equipo te contactará pronto 🙏"
}
```

La plataforma enviará el `error_message` al cliente y activará el handoff humano automáticamente.

---

### Estructura de `message_to_client`

Puede ser un **string** simple o un **objeto canónico**:

**String:**
```json
{ "message_to_client": "Tu diseño está listo 🎨" }
```

**Objeto tipo `text`:**
```json
{
  "message_to_client": {
    "type": "text",
    "body": "Tu diseño está listo 🎨"
  }
}
```

**Objeto tipo `image`:**
```json
{
  "message_to_client": {
    "type": "image",
    "url": "https://cdn.../diseño.jpg",
    "caption": "Tu diseño 🎨"
  }
}
```

**Objeto tipo `multi` (varios mensajes seguidos):**
```json
{
  "message_to_client": {
    "type": "multi",
    "messages": [
      { "type": "image", "url": "...", "caption": "..." },
      { "type": "text", "body": "..." }
    ]
  }
}
```

---

## 6. Resumen de endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/payments/link` | Crear link de pago MP |
| `GET` | `/api/payments?payment_id=` | Consultar estado de pago |
| `POST` | `/api/designs` | Solicitar generación de diseño |
| `GET` | `/api/designs?job_id=` | Consultar estado de diseño |
| `POST` | `/api/designs/approve` | Aprobar diseño |
| `POST` | `/api/designs/revision` | Solicitar revisión |
| `POST` | `/api/orders` | Crear pedido (apartado o completo) |
| `POST` | `/api/orders/pay-balance` | Confirmar pago de saldo |
| `GET` | `/api/orders/by-whatsapp?whatsapp_phone={whatsapp_phone}` | Consultar pedidos por WhatsApp |
| `GET` | `/api/orders/by-email?email={email}` | Consultar pedidos por correo |
| `POST` | `{plataforma}/whatsapp/webhooks/async/{channel_id}/{session_id}` | **Callback** del ecommerce a la plataforma |

---

## 7. Diagrama de flujo completo

```
Cliente                 Agente (plataforma)              Ecommerce
   │                          │                               │
   │── "quiero una de estas" ►│                               │
   │◄── preview + precio ─────│                               │
   │                          │                               │
   │── envía foto ───────────►│                               │
   │                          │── POST /api/designs ─────────►│
   │◄── "generando diseño..." ─│◄── 202 { job_id } ───────── ─│
   │                          │                       job listo│
   │                          │◄── callback async ────────────│
   │◄── imagen del diseño ────│                               │
   │                          │                               │
   │── "me gusta" ───────────►│                               │
   │                          │── POST /designs/{id}/approve ►│
   │                          │                               │
   │◄── link pago apartado ───│── POST /api/payments/link ───►│
   │                          │◄── { payment_id, url } ───────│
   │── paga $100 ────────────►│                               │
   │                          │── GET /api/payments/{id} ────►│
   │                          │◄── { status: "approved" } ────│
   │                          │── POST /api/orders ──────────►│  ← crea con status "apartado"
   │◄── "apartado confirmado" ─│◄── { order_id, "apartado" } ─│
   │                          │                               │
   │── "pagar saldo" ────────►│                               │
   │◄── link saldo ───────────│── POST /api/payments/link ───►│
   │── paga saldo ───────────►│                               │
   │                          │── GET /api/payments/{id} ────►│
   │                          │── POST /orders/{id}/pay-bal ─►│  ← actualiza a "en_produccion"
   │◄── "¡en producción! 🎉" ──│◄── { status: "en_produccion"} │
```

> Si el cliente paga el total de una vez, se omite el paso del apartado y el pedido se crea directamente con `status: "en_produccion"`.

---

## 8. Preguntas frecuentes

**¿El pedido se puede cancelar si el cliente no paga el saldo?**  
Eso queda a criterio del ecommerce. La plataforma no cancela pedidos automáticamente. Se recomienda que el ecommerce implemente una política de cancelación automática si un pedido permanece en `"apartado"` más de N días.

**¿El agente llama a `pay-balance` automáticamente?**  
Sí, igual que con `create_order`: el agente verifica primero que el pago del saldo esté aprobado (`GET /api/payments/{id}`) y luego llama `pay-balance` con ese `payment_id`.

**¿Y si el cliente paga el total desde el inicio?**  
El agente llama directamente a `POST /api/orders` con `payment_type: "mp_full"` o `"transfer_full"`. El pedido se crea con `status: "en_produccion"` y no se llama `pay-balance`.

**¿El `whatsapp_phone` siempre llega en el mismo formato?**  
Sí. El número siempre está en formato internacional sin `+` (ej. `5215551234`).

**¿Qué pasa si el webhook de callback falla (timeout, error 5xx)?**  
La plataforma no tiene reintentos automáticos actualmente. El ecommerce debe implementar reintentos en su scheduler de jobs. Alternativamente, el ecommerce puede detectar timeouts y llamar al webhook con `status: "failed"` para que la plataforma active el handoff humano.

**¿Los `_*` fields en el body son siempre strings?**  
Sí, siempre son strings. `whatsapp_phone` no tiene el `+` del prefijo internacional.

**¿Puede el ecommerce ignorar los `_*` fields?**  
Sí, completamente. Son opcionales para el ecommerce. Solo importan para el callback async.

**¿El `payment_id` de `create_order` ya fue verificado antes de llegar aquí?**  
Sí. El agente llama primero a `check_payment_status` y solo llama a `create_order` cuando el status es `approved`. Lo mismo aplica para `pay-balance`. Sin embargo, el ecommerce debe validarlo también por seguridad.

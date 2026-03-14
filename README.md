# Lamps AI

Plataforma de lámparas personalizadas. El usuario sube una foto, llena sus datos de envío y paga con MercadoPago. El pedido queda registrado y puede seguir su estado desde su cuenta.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | FastAPI (Python 3.12), uvicorn |
| Base de datos | DynamoDB (4 tablas) |
| Almacenamiento | AWS S3 |
| Pagos | MercadoPago Checkout Pro |
| Email | Amazon SES (recuperación de carritos abandonados) |
| Scheduler | APScheduler 3.x (tarea cada 15 min) |
| Auth | JWT (HS256), 7 días de expiración |

---

## Estructura del proyecto

```
lamps-ai/
├── backend/
│   ├── main.py                  # Entry point FastAPI + lifespan (APScheduler)
│   ├── pyproject.toml
│   ├── .env                     # Variables de entorno (no commitear)
│   ├── app/
│   │   ├── config.py            # Configuración y variables de entorno
│   │   ├── database.py          # Conexión DynamoDB
│   │   ├── s3.py                # Helpers S3 (upload, presigned URLs)
│   │   ├── auth_utils.py        # Hash de contraseñas, JWT
│   │   ├── dependencies.py      # Dependencias FastAPI (auth guards)
│   │   ├── pixel_events.py      # Meta Conversions API (CAPI)
│   │   ├── routers/
│   │   │   ├── auth.py          # /api/auth/*
│   │   │   ├── photos.py        # /api/photos/*
│   │   │   ├── orders.py        # /api/orders/*
│   │   │   ├── catalog.py       # /api/catalog/*
│   │   │   ├── admin.py         # /api/admin/*
│   │   │   └── carts.py         # /api/carts/*
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── photos_service.py
│   │   │   ├── orders_service.py
│   │   │   ├── admin_service.py
│   │   │   └── carts_service.py  # Lógica carritos abandonados + SES
│   │   └── schemas/
│   │       ├── auth.py
│   │       ├── orders.py
│   │       └── admin.py
│   └── scripts/
│       ├── create_tables.py     # Crea las 4 tablas DynamoDB (idempotente)
│       └── clear_tables.py      # Limpia datos de las tablas
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                    # Home
        │   ├── login/page.tsx              # Login / registro
        │   ├── checkout/page.tsx           # Flujo de compra (3 pasos)
        │   ├── pedido/[id]/page.tsx        # Estado del pedido
        │   ├── mi-cuenta/pedidos/page.tsx  # Mis pedidos
        │   └── admin/dashboard/page.tsx    # Panel de administración
        ├── components/
        │   ├── Navbar.tsx
        │   └── UtmTracker.tsx
        ├── contexts/
        │   └── AuthContext.tsx             # Estado de sesión global
        └── lib/
            ├── api.ts                      # Cliente HTTP (get, post, patch)
            ├── pixelEvents.ts              # Meta Pixel (browser)
            └── utm.ts                      # Captura y persistencia de UTMs
```

---

## Variables de entorno

### Backend (`backend/.env`)

```env
# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=lamps-ai

# DynamoDB
DYNAMO_TABLE_USERS=lamps_users
DYNAMO_TABLE_PHOTOS=lamps_photos
DYNAMO_TABLE_ORDERS=lamps_orders
DYNAMO_TABLE_CARTS=lamps_carts

# Auth
JWT_SECRET=una-clave-secreta-larga

# Admin
ADMIN_EMAIL=admin@lamps.ai
ADMIN_PASSWORD=password-del-admin

# MercadoPago
MP_ACCESS_TOKEN=APP_USR-...

# App
FRONTEND_URL=http://localhost:3000   # Cambiar a URL de ngrok/producción al pagar

# Email — carritos abandonados (vacío = deshabilitado)
SES_FROM_EMAIL=noreply@tudominio.com

# Meta
META_PIXEL_ID=
META_ACCESS_TOKEN=
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_META_PIXEL_ID=
```

> Si accedes al frontend por ngrok, el backend también debe exponerse por ngrok y actualizar `NEXT_PUBLIC_API_URL`.

---

## Instalación y ejecución

### Backend

```powershell
cd backend
uv venv
uv sync

# Crear tablas DynamoDB (solo la primera vez)
uv run python scripts/create_tables.py

# Levantar servidor
uv run uvicorn main:app --reload --port 8000
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

---

## API Endpoints

### Auth — `/api/auth`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Registro de usuario |
| POST | `/api/auth/login` | No | Login, devuelve JWT |
| GET | `/api/auth/me` | Sí | Perfil del usuario autenticado |

### Fotos — `/api/photos`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/photos/upload` | Opcional | Sube foto a S3, devuelve `photo_id` |

### Pedidos — `/api/orders`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/orders/` | Sí | Crea pedido y preferencia en MercadoPago |
| GET | `/api/orders/mine` | Sí | Lista pedidos del usuario |
| GET | `/api/orders/{id}` | Sí | Detalle de un pedido |
| POST | `/api/orders/{id}/sync-payment?payment_id=xxx` | Sí | Sincroniza estado de pago desde MP |
| POST | `/api/orders/webhook/mp` | No | Webhook de MercadoPago |

### Carritos — `/api/carts`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/carts/` | No | Guarda/actualiza un draft de carrito |
| GET | `/api/carts/{cart_id}` | No | Recupera un draft |
| POST | `/api/carts/{cart_id}/convert` | No | Marca el carrito como convertido |

### Admin — `/api/admin`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/admin/orders` | Admin | Lista todos los pedidos |
| PATCH | `/api/admin/orders/{id}` | Admin | Actualiza estado del pedido |
| GET | `/api/admin/stats` | Admin | Estadísticas generales |

**Cuenta admin:** email `admin@lamps.ai`, contraseña definida en `ADMIN_PASSWORD`.

---

## DynamoDB — Tablas

| Tabla | PK | GSI | TTL |
|-------|----|-----|-----|
| `lamps_users` | `email` | — | — |
| `lamps_photos` | `photo_id` | — | — |
| `lamps_orders` | `order_id` | `email-index` (user_email) | — |
| `lamps_carts` | `cart_id` | — | `expires_ttl` (30 días) |

---

## Flujo de compra

```
1. Usuario sube foto en /checkout (paso 1)
   └─ POST /api/photos/upload → photo_id
   └─ (opcional) crea cuenta o inicia sesión en el mismo paso

2. Usuario llena datos de envío (paso 2)

3. Usuario confirma el pedido (paso 3)
   └─ POST /api/orders/ → crea orden en DynamoDB + preferencia en MercadoPago
      └─ frontend redirige a mp_init_point

4. Usuario paga en MercadoPago

5. MP redirige a /pedido/{id}?status=success&payment_id=xxx
   └─ frontend llama POST /api/orders/{id}/sync-payment?payment_id=xxx
      └─ backend consulta el pago en MP y actualiza status en DynamoDB

6. (Opcional) MP llama al webhook /api/orders/webhook/mp como confirmación definitiva
```

### Recuperación de carritos abandonados

El backend guarda un draft (`lamps_carts`) cada vez que el usuario avanza en el checkout sin completar el pago. APScheduler ejecuta `process_abandoned_carts` cada 15 minutos: si el carrito tiene más de 1 hora sin actividad y no fue convertido, envía un email de recordatorio vía SES (deshabilitado si `SES_FROM_EMAIL` está vacío).

---

## Desarrollo local con MercadoPago (ngrok)

MercadoPago requiere URLs públicas para las `back_urls` y para el webhook. En desarrollo local se usa ngrok:

```powershell
# Exponer el frontend (necesario para back_urls)
ngrok http 3000
# → Copiar la URL HTTPS, ej: https://abc123.ngrok-free.app

# Actualizar en backend/.env:
FRONTEND_URL=https://abc123.ngrok-free.app
```

> Accede al frontend en `http://localhost:3000` (no por ngrok) para evitar errores de mixed content.
> La URL de ngrok solo es necesaria para que MP pueda redirigir de vuelta correctamente.

---

## Estados de un pedido

| Estado | Descripción |
|--------|-------------|
| `pending_payment` | Creado, esperando pago |
| `paid` | Pago confirmado |
| `in_process` | En producción |
| `shipped` | Enviado |
| `delivered` | Entregado |
| `payment_failed` | Pago rechazado |
| `cancelled` | Cancelado |

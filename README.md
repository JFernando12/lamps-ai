# Lamps AI

Plataforma para generar lámparas personalizadas con IA. El usuario sube una foto, recibe un render fotorrealista de cómo quedaría su lámpara, y puede comprarla pagando con MercadoPago.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind CSS |
| Backend | FastAPI (Python), uvicorn |
| Base de datos | DynamoDB (3 tablas) |
| Almacenamiento | AWS S3 |
| IA | OpenAI (generación de renders) |
| Pagos | MercadoPago Checkout Pro |
| Auth | JWT (HS256), 7 días de expiración |

---

## Estructura del proyecto

```
lamps-ai/
├── backend/
│   ├── main.py                  # Entry point FastAPI
│   ├── pyproject.toml
│   ├── requirements.txt
│   ├── .env                     # Variables de entorno (no commitear)
│   ├── app/
│   │   ├── config.py            # Configuración y variables de entorno
│   │   ├── database.py          # Conexión DynamoDB
│   │   ├── s3.py                # Helpers S3 (upload, presigned URLs)
│   │   ├── auth_utils.py        # Hash de contraseñas, JWT
│   │   ├── dependencies.py      # Dependencias FastAPI (auth guards)
│   │   ├── routers/
│   │   │   ├── auth.py          # /api/auth/*
│   │   │   ├── ai.py            # /api/ai/*
│   │   │   ├── orders.py        # /api/orders/*
│   │   │   └── admin.py         # /api/admin/*
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── ai_service.py
│   │   │   ├── orders_service.py
│   │   │   └── admin_service.py
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── orders.py
│   │   │   └── admin.py
│   │   └── modules/
│   │       ├── lineart.py       # Generación de líneas vectoriales
│   │       ├── render.py        # Render fotorrealista con OpenAI
│   │       └── vectorize.py     # Vectorización de imagen
│   └── scripts/
│       ├── create_tables.py     # Crea las tablas DynamoDB
│       └── clear_tables.py      # Limpia datos de las tablas
└── frontend/
    └── src/
        ├── app/
        │   ├── page.tsx                    # Home — generador de preview
        │   ├── login/page.tsx              # Login / registro
        │   ├── checkout/page.tsx           # Formulario de compra
        │   ├── pedido/[id]/page.tsx        # Estado del pedido
        │   ├── mi-cuenta/pedidos/page.tsx  # Mis pedidos
        │   └── admin/dashboard/page.tsx    # Panel de administración
        ├── components/
        │   └── Navbar.tsx
        ├── contexts/
        │   └── AuthContext.tsx             # Estado de sesión global
        └── lib/
            └── api.ts                      # Cliente HTTP (get, post, patch)
```

---

## Variables de entorno

### Backend (`backend/.env`)

```env
# OpenAI
OPENAI_API_KEY=sk-...

# AWS
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# Auth
JWT_SECRET=una-clave-secreta-larga

# Admin
ADMIN_PASSWORD=password-del-admin

# MercadoPago
MP_ACCESS_TOKEN=APP_USR-...
MP_PUBLIC_KEY=APP_USR-...

# App
FRONTEND_URL=http://localhost:3000   # Cambiar a URL de ngrok/producción al pagar

# Dev
MOCK_AI=false   # true para omitir OpenAI y devolver imagen placeholder
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000   # Cambiar si el backend tiene otra URL
```

> Si accedes al frontend por ngrok, el backend también debe exponerse por ngrok y actualizar `NEXT_PUBLIC_API_URL`.

---

## Instalación y ejecución

### Backend

```powershell
cd backend
uv venv
uv pip install -r requirements.txt

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

### IA — `/api/ai`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/ai/preview` | Opcional | Sube foto, devuelve render de lámpara |

### Pedidos — `/api/orders`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/orders/` | Sí | Crea pedido y preferencia en MercadoPago |
| GET | `/api/orders/mine` | Sí | Lista pedidos del usuario |
| GET | `/api/orders/{id}` | Sí | Detalle de un pedido |
| POST | `/api/orders/{id}/sync-payment?payment_id=xxx` | Sí | Sincroniza estado de pago desde MP (llamado al volver del checkout) |
| POST | `/api/orders/webhook/mp` | No | Webhook de MercadoPago |

### Admin — `/api/admin`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/admin/orders` | Admin | Lista todos los pedidos |
| PATCH | `/api/admin/orders/{id}` | Admin | Actualiza estado del pedido |
| GET | `/api/admin/stats` | Admin | Estadísticas generales |

**Cuenta admin:** email `admin@lamps.ai`, contraseña definida en `ADMIN_PASSWORD`.

---

## DynamoDB — Tablas

| Tabla | PK | GSI |
|-------|----|-----|
| `lamps_users` | `email` | — |
| `lamps_previews` | `preview_id` | `email-index` (user_email) |
| `lamps_orders` | `order_id` | `email-index` (user_email) |

---

## Flujo de compra

```
1. Usuario sube foto en /
   └─ POST /api/ai/preview → render + preview_id

2. Usuario llena datos de envío en /checkout
   └─ POST /api/orders/ → crea orden en DynamoDB + preferencia en MercadoPago
      └─ frontend redirige a mp_sandbox_init_point (dev) / mp_init_point (prod)

3. Usuario paga en MercadoPago

4. MP redirige a /pedido/{id}?status=success&payment_id=xxx
   └─ frontend llama POST /api/orders/{id}/sync-payment?payment_id=xxx
      └─ backend consulta el pago en MP y actualiza status en DynamoDB
         └─ frontend muestra estado actualizado

5. (Opcional) MP llama al webhook /api/orders/webhook/mp como confirmación definitiva
```

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

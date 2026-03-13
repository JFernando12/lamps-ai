# Facebook Ads — Roadmap de implementación

Estado del pixel actual: ID `1310654400890735`

---

## Eventos ya implementados

| Evento | Dónde | Notas |
|---|---|---|
| `PageView` | layout.tsx (global) | Sin `eventID` |
| `InitiateCheckout` | checkout/page.tsx mount | Sin `eventID` |
| `PhotoUploaded` (custom) | PhotoStep.tsx | Sin `eventID` |
| `CompleteRegistration` | DetailsStep.tsx | Sin `eventID` |
| `AddShippingInfo` | DetailsStep.tsx submit | Sin `eventID` |
| `AddPaymentInfo` | PaymentStep.tsx antes de redirigir a MP | Sin `eventID` |
| `Purchase` | pedido/[id]/page.tsx con `?status=success` | Sin `eventID` |

---

## CRÍTICO 🔴

### 1. Conversions API (CAPI) — Backend
- Enviar `Purchase` y `InitiateCheckout` desde el backend via Meta Graph API
- Endpoint: `POST https://graph.facebook.com/v19.0/{pixel_id}/events`
- Campos requeridos: `event_name`, `event_time`, `event_id` (para dedup), user data hasheado (`em`, `ph`, `fn`, `ln`, `client_ip_address`, `client_user_agent`, `fbc`, `fbp`)
- Necesita: `META_ACCESS_TOKEN` y `META_PIXEL_ID` en variables de entorno del backend
- Archivos a crear/modificar:
  - `backend/app/services/meta_service.py` (ya existe parcialmente)
  - `backend/app/routers/orders.py` — llamar CAPI al confirmar pago
  - `backend/app/schemas/orders.py` — agregar campos UTM y fbclid

### 2. `event_id` en todos los eventos del browser
- Generar un UUID por evento y pasarlo como tercer argumento: `fbq('track', 'Purchase', data, { eventID: 'uuid' })`
- El mismo `event_id` debe enviarse desde CAPI para deduplicación
- El `event_id` del `Purchase` debe ser el `order_id` (ya existe)
- Archivos: `checkout/page.tsx`, `checkout/components/PhotoStep.tsx`, `checkout/components/DetailsStep.tsx`, `checkout/components/PaymentStep.tsx`, `pedido/[id]/page.tsx`

### 3. Páginas legales `/privacidad` y `/terminos`
- Facebook rechaza ads si no hay Privacy Policy accesible
- Crear: `frontend/src/app/privacidad/page.tsx` y `frontend/src/app/terminos/page.tsx`
- El footer ya tiene links a estas rutas

### 4. `ViewContent` en ProductSection y al entrar al checkout
- **ProductSection home**: disparar cuando la sección entra al viewport (IntersectionObserver)
  ```js
  fbq('track', 'ViewContent', { content_ids: ['rgb', 'madera'], content_type: 'product', value: 597, currency: 'MXN' })
  ```
- **checkout/page.tsx**: disparar al cargar con el product específico en el query param

---

## IMPORTANTE 🟠

### 5. Captura de UTM parameters + `fbclid`
- Al aterrizaje, leer `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid` de la URL
- Guardar en `localStorage` con TTL de 30 días (last-touch)
- Enviar al backend al crear la orden (`POST /api/orders/`)
- Guardar en la tabla `orders` en la DB:
  - Columnas: `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbclid`
  - Migration: `backend/scripts/create_tables.py`
- Usar `fbclid` para construir el parámetro `fbc` en CAPI

### 6. `AddToCart` en ProductSection CTAs
- Dispara al hacer clic en "Comprar ahora" / "Personalizar" antes de navegar al checkout
- Archivo: `frontend/src/components/home/ProductSection.tsx`
  ```js
  fbq('track', 'AddToCart', { content_ids: ['rgb'], content_type: 'product', value: 597, currency: 'MXN' })
  ```

### 7. Verificación de dominio
- Agregar meta tag en `layout.tsx`:
  ```html
  <meta name="facebook-domain-verification" content="CÓDIGO_DE_META" />
  ```
- El código se obtiene en Meta Business Manager > Brand Safety > Domains

### 8. Feed de catálogo de productos (para Dynamic Ads)
- Crear endpoint: `GET /api/catalog/feed` que devuelve XML/JSON con formato Meta
- Productos: `rgb` ($597) y `madera` ($719)
- Campos: `id`, `title`, `description`, `availability`, `condition`, `price`, `image_link`, `link`, `brand`
- Archivo: `backend/app/routers/` nuevo router `catalog.py`

---

## MEJORAS 🟡

### 9. OG tags completos en layout.tsx
- Agregar `og:image` (imagen real del producto), `og:url` con dominio real, `og:site_name`
- Meta Pixel tag de verificación
- Twitter Card tags para ampliar alcance de shares

### 10. `fbclid` → parámetro `fbc` para CAPI
- Formato: `fb.1.{timestamp}.{fbclid}`
- Guardar en cookie `_fbc` además de localStorage

### 11. Evento `Contact` en botones de WhatsApp
- Home footer floating button + FAQ link → `fbq('track', 'Contact')`
- Archivos: `frontend/src/app/page.tsx`, `frontend/src/components/home/FaqSection.tsx`

### 12. Evento custom `PaymentFailed`
- En `pedido/[id]/page.tsx` cuando `?status=failure` → `fbq('trackCustom', 'PaymentFailed', { value, currency: 'MXN' })`
- Base para audiencia de retargeting "intentó pagar pero falló"

### 13. Noscript pixel fallback
- Agregar `<noscript><img height="1" width="1" src="https://www.facebook.com/tr?id=PIXEL_ID&ev=PageView&noscript=1"></noscript>` en layout.tsx

### 14. Scroll/engagement tracking
- `ViewedLanding` custom cuando scroll > 50% en la home
- `ViewedProduct` custom cuando ProductSection entra al viewport

---

## ESTRATÉGICO 🔵 (fase 2)

### 15. Landing pages por campaña
- `/dia-de-las-madres` — campaña mayo
- `/regalo-cumpleanos` — campaña evergreen
- Sin navbar, copy específico al ad, dispara `ViewContent` inmediatamente
- Usar Next.js dynamic routes o páginas estáticas

### 16. Lead capture en home
- Popup o sección de email capture con descuento
- `fbq('track', 'Lead', { value: 0, currency: 'MXN' })`
- Crear tabla `leads` en el backend + endpoint `POST /api/leads`
- Para Custom Audiences y Lookalike Audiences

---

## Admin: Dashboard de Ads (nuevo)

### Ruta: `/admin/ads`

#### Sección 1: Configuración
- Pixel ID (editable, guardado en DB o env)
- Access Token para CAPI (editable, encriptado)
- Estado de verificación del dominio
- Status de la conexión CAPI (último evento enviado, errores)
- UTM parameters activos

#### Sección 2: Atribución interna (datos propios)
- Tabla de órdenes con columnas UTM (fuente, campaña, contenido)
- Gráfica de órdenes por `utm_source` y `utm_campaign`
- Revenue atribuido por campaña
- Filtros por rango de fecha

#### Sección 3: Meta Ads API (datos de Facebook)
- Requiere `Meta Ads Account ID` y `Meta App Token`
- Métricas: Spend, Impresiones, Clics, CPM, CPC, ROAS, Add to Cart, Purchases
- Desglose por campaña / adset / ad
- Conectar con revenue interno para ROAS real vs reportado por Meta

#### Sección 4: Estado del Pixel
- Últimos eventos registrados (desde backend log)
- Match rate de usuarios
- Eventos con errores

---

## Variables de entorno necesarias

### Backend (.env)
```
META_PIXEL_ID=1310654400890735
META_ACCESS_TOKEN=  # System User Token con permiso ads_management / pixel
META_API_VERSION=v19.0
META_ADS_ACCOUNT_ID=  # act_XXXXXXXXX
```

### Frontend (.env.local)
```
NEXT_PUBLIC_META_PIXEL_ID=1310654400890735
NEXT_PUBLIC_SITE_URL=https://thedreamgift.mx
```

---

## Orden de implementación sugerido

1. `event_id` en todos los eventos browser (rápido, sin dependencias)
2. Columnas UTM + fbclid en tabla `orders` (DB migration)
3. Captura de UTM/fbclid en frontend → enviado al backend al crear orden
4. CAPI en backend para `Purchase` (el evento más valioso)
5. `ViewContent` en ProductSection y checkout
6. `AddToCart` en ProductSection CTAs
7. Páginas `/privacidad` y `/terminos`
8. Feed de catálogo de productos
9. Admin dashboard de ads
10. Landing pages por campaña (fase 2)

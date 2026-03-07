"""SES email sending for abandoned cart recovery."""
import logging

import boto3

from . import config

logger = logging.getLogger(__name__)

_SUBJECTS = [
    "Tu lámpara personalizada te está esperando 🕯️",
    "¿Sigues interesado? Tu diseño sigue guardado ✨",
    "Último aviso — tu diseño expira pronto ⏳",
]


def _product_name(product_id: str) -> str:
    return "Lámpara base de madera" if product_id == "madera" else "Lámpara acrílica LED RGB"


def _build_html(cart_id: str, step: int, product_id: str) -> str:
    recovery_url = f"{config.FRONTEND_URL}/checkout?cart_id={cart_id}&product={product_id}"
    pname = _product_name(product_id)

    bodies = [
        # ── Email 1 — 1 h after abandonment ──────────────────────────────
        f"""
        <h2 style="color:#111;margin:0 0 14px;font-size:22px;">
          Tu lámpara personalizada te espera 🕯️
        </h2>
        <p style="color:#444;line-height:1.7;margin:0 0 10px;">
          Empezaste a crear tu <strong>{pname}</strong> pero no terminaste el pedido.
        </p>
        <p style="color:#444;line-height:1.7;margin:0;">
          Tu foto y personalizaciones están guardadas — solo faltan tus datos de envío.
        </p>
        """,

        # ── Email 2 — 24 h after email 1 ─────────────────────────────────
        f"""
        <h2 style="color:#111;margin:0 0 14px;font-size:22px;">
          ¿Sigues interesado en tu lámpara? ✨
        </h2>
        <p style="color:#444;line-height:1.7;margin:0 0 10px;">
          Tu diseño personalizado de <strong>{pname}</strong> sigue esperándote.
        </p>
        <p style="color:#444;line-height:1.7;margin:0;">
          Miles de clientes ya disfrutan su lámpara en casa.
          Tu diseño sigue guardado — continúa cuando quieras.
        </p>
        """,

        # ── Email 3 — 48 h after email 2 ─────────────────────────────────
        f"""
        <h2 style="color:#111;margin:0 0 14px;font-size:22px;">
          Último aviso — tu diseño expira pronto ⏳
        </h2>
        <p style="color:#444;line-height:1.7;margin:0 0 10px;">
          Tu <strong>{pname}</strong> personalizada estará disponible <strong>48 horas más</strong>.
        </p>
        <p style="color:#444;line-height:1.7;margin:0;">
          Después de eso tu diseño se eliminará y tendrás que empezar de nuevo.
          Termina tu pedido ahora para asegurar tu lámpara.
        </p>
        """,
    ]

    body_html = bodies[min(step, 3) - 1]

    return f"""<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111111;padding:20px 28px;border-radius:12px 12px 0 0;text-align:center;">
            <span style="color:#f59e0b;font-size:20px;font-weight:bold;letter-spacing:0.5px;">
              🕯️ Lamps AI
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:36px 28px;border-radius:0 0 12px 12px;">
            {body_html}

            <!-- CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
              <tr><td align="center">
                <a href="{recovery_url}"
                   style="background:#f59e0b;color:#000000;padding:15px 36px;
                          border-radius:9px;text-decoration:none;font-weight:bold;
                          font-size:16px;display:inline-block;letter-spacing:0.3px;">
                  Terminar mi pedido →
                </a>
              </td></tr>
            </table>

            <!-- Footer -->
            <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 20px;">
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;line-height:1.6;">
              Lamps AI · México<br>
              <a href="{config.FRONTEND_URL}/privacidad" style="color:#9ca3af;">
                Aviso de privacidad
              </a>
              &nbsp;·&nbsp;
              Si ya completaste tu pedido, ignora este mensaje.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def send_abandoned_cart_email(
    email: str,
    cart_id: str,
    step: int,
    product_id: str = "rgb",
) -> bool:
    """Send abandoned cart recovery email via SES. Returns True on success."""
    if not config.SES_FROM_EMAIL:
        logger.debug("SES_FROM_EMAIL not configured — skipping abandoned cart email")
        return False
    try:
        ses = boto3.client(
            "ses",
            region_name=config.AWS_REGION,
            aws_access_key_id=config.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
        )
        ses.send_email(
            Source=config.SES_FROM_EMAIL,
            Destination={"ToAddresses": [email]},
            Message={
                "Subject": {
                    "Data": _SUBJECTS[min(step, 3) - 1],
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Html": {
                        "Data": _build_html(cart_id, step, product_id),
                        "Charset": "UTF-8",
                    }
                },
            },
        )
        logger.info("Sent abandoned-cart email #%d → %s (cart=%s)", step, email, cart_id)
        return True
    except Exception as exc:
        logger.warning("Failed to send abandoned-cart email → %s: %s", email, exc)
        return False

"""Product catalog feed for Meta Dynamic Ads.

Returns an RSS/XML feed compatible with Meta Commerce Manager so Dynamic Ads
can automatically match ViewContent / AddToCart / Purchase events to products.
"""
from fastapi import APIRouter
from fastapi.responses import Response

from .. import config

router = APIRouter(prefix="/api/catalog", tags=["catalog"])

_PRODUCTS = [
    {
        "id": "rgb",
        "title": "Lámpara acrílica LED RGB personalizada",
        "description": (
            "Convierte tu foto en una lámpara acrílica LED RGB única, grabada con láser. "
            "16 colores, control remoto incluido. Tamaño 20×15 cm. Cable USB incluido."
        ),
        "price": "598.00 MXN",
        "image_path": "/gallery/lampara-2-v2.jpg",
        "checkout_path": "/checkout?product=rgb",
    },
    {
        "id": "madera",
        "title": "Lámpara base de madera personalizada",
        "description": (
            "Convierte tu foto en una lámpara con base de madera natural maciza, "
            "grabada con láser. Luz cálida 3000K. Tamaño 20×15 cm. Cable USB incluido."
        ),
        "price": "719.00 MXN",
        "image_path": "/gallery/lampara-madera-1.jpg",
        "checkout_path": "/checkout?product=madera",
    },
]


@router.get("/feed", response_class=Response)
def product_feed():
    """RSS 2.0 feed with Google Product schema (compatible with Meta catalog)."""
    site = config.FRONTEND_URL.rstrip("/")
    items_xml = ""
    for p in _PRODUCTS:
        items_xml += f"""
    <item>
      <g:id>{p['id']}</g:id>
      <g:title>{p['title']}</g:title>
      <g:description>{p['description']}</g:description>
      <g:link>{site}{p['checkout_path']}</g:link>
      <g:image_link>{site}{p['image_path']}</g:image_link>
      <g:availability>in stock</g:availability>
      <g:condition>new</g:condition>
      <g:price>{p['price']}</g:price>
      <g:brand>The Dream Gift</g:brand>
      <g:google_product_category>Home &amp; Garden &gt; Lighting</g:google_product_category>
    </item>"""

    xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>The Dream Gift — Catálogo de productos</title>
    <link>{site}</link>
    <description>Lámparas acrílicas LED personalizadas con foto grabada con láser</description>
    {items_xml}
  </channel>
</rss>"""

    return Response(content=xml, media_type="application/xml; charset=utf-8")

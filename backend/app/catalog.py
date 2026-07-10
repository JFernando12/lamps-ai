"""Single source of truth for product catalog.

All services (checkout, agent, admin) import from here.
Product IDs match the frontend: "rgb" and "madera".
"""

PRODUCTS: dict[str, dict] = {
    "rgb":    {"title": "Lámpara acrílica LED RGB", "unit_price": 597.0},
    "madera": {"title": "Lámpara base de madera",   "unit_price": 719.0},
}

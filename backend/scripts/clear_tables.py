#!/usr/bin/env python3
"""Delete ALL items from every DynamoDB table.

Usage:
    uv run python scripts/clear_tables.py            # borra todo
    uv run python scripts/clear_tables.py --yes      # sin confirmación

⚠️  IRREVERSIBLE — úsalo solo en desarrollo.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import boto3
from app import config

# Table name → list of primary key attribute names (hash key, [range key])
TABLES = {
    config.DYNAMO_TABLE_USERS:    ["email"],
    config.DYNAMO_TABLE_PHOTOS:   ["photo_id"],
    config.DYNAMO_TABLE_ORDERS:   ["order_id"],
    config.DYNAMO_TABLE_CARTS:    ["cart_id"],
}

dynamo = boto3.resource(
    "dynamodb",
    region_name=config.AWS_REGION,
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
)


def clear_table(table_name: str, key_attrs: list[str]) -> int:
    table = dynamo.Table(table_name)
    deleted = 0

    scan_kwargs: dict = {}
    while True:
        response = table.scan(
            ProjectionExpression=", ".join(f"#k{i}" for i in range(len(key_attrs))),
            ExpressionAttributeNames={f"#k{i}": attr for i, attr in enumerate(key_attrs)},
            **scan_kwargs,
        )
        items = response.get("Items", [])

        with table.batch_writer() as batch:
            for item in items:
                key = {attr: item[attr] for attr in key_attrs}
                batch.delete_item(Key=key)
                deleted += 1

        last = response.get("LastEvaluatedKey")
        if not last:
            break
        scan_kwargs["ExclusiveStartKey"] = last

    return deleted


def main() -> None:
    skip_confirm = "--yes" in sys.argv

    print("⚠️  Esto borrará TODOS los items de las siguientes tablas:")
    for name in TABLES:
        print(f"   • {name}")
    print()

    if not skip_confirm:
        answer = input("¿Continuar? [s/N]: ").strip().lower()
        if answer not in ("s", "si", "sí", "y", "yes"):
            print("Cancelado.")
            sys.exit(0)

    print()
    for table_name, key_attrs in TABLES.items():
        print(f"Limpiando {table_name}...", end=" ", flush=True)
        count = clear_table(table_name, key_attrs)
        print(f"{count} items borrados.")

    print("\nListo.")


if __name__ == "__main__":
    main()

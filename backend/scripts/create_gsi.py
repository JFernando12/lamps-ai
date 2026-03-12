"""
Create missing GSI indexes on DynamoDB tables.

Indexes created:
  lamps_orders  → whatsapp_phone-index  (for get_orders_by_phone)
  lamps_orders  → email-index           (for get_orders_by_email)
  lamps_payments → order_id-index       (for payment lookups by order)

Run: uv run python scripts/create_gsi.py
"""
import os
import sys
import time
import boto3
from dotenv import load_dotenv

# Load .env from the backend root (one level up from scripts/)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

AWS_REGION = "us-east-1"
AWS_ACCESS_KEY_ID = os.environ["AWS_ACCESS_KEY_ID"]
AWS_SECRET_ACCESS_KEY = os.environ["AWS_SECRET_ACCESS_KEY"]
DYNAMO_TABLE_ORDERS = "lamps_orders"
DYNAMO_TABLE_PAYMENTS = "lamps_payments"

dynamo = boto3.client(
    "dynamodb",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)


def table_gsi_names(table_name: str) -> set[str]:
    resp = dynamo.describe_table(TableName=table_name)
    existing = resp["Table"].get("GlobalSecondaryIndexes", [])
    return {gsi["IndexName"] for gsi in existing}


def add_gsi(table_name: str, index_name: str, hash_key: str, hash_type: str = "S") -> None:
    existing = table_gsi_names(table_name)
    if index_name in existing:
        print(f"  [skip] {table_name} / {index_name} already exists")
        return

    print(f"  [create] {table_name} / {index_name} ...")
    dynamo.update_table(
        TableName=table_name,
        AttributeDefinitions=[
            {"AttributeName": hash_key, "AttributeType": hash_type},
        ],
        GlobalSecondaryIndexUpdates=[
            {
                "Create": {
                    "IndexName": index_name,
                    "KeySchema": [
                        {"AttributeName": hash_key, "KeyType": "HASH"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                }
            }
        ],
    )

    # Wait until the index is ACTIVE
    for _ in range(60):
        time.sleep(5)
        status = table_gsi_names(table_name)
        resp = dynamo.describe_table(TableName=table_name)
        gsi_list = resp["Table"].get("GlobalSecondaryIndexes", [])
        gsi = next((g for g in gsi_list if g["IndexName"] == index_name), None)
        if gsi and gsi.get("IndexStatus") == "ACTIVE":
            print(f"  [ready] {index_name}")
            return
        print(f"  [waiting] {index_name} ...")
    print(f"  [timeout] {index_name} did not become ACTIVE in time", file=sys.stderr)


if __name__ == "__main__":
    orders_table = DYNAMO_TABLE_ORDERS
    payments_table = DYNAMO_TABLE_PAYMENTS

    print(f"Orders table: {orders_table}")
    add_gsi(orders_table, "whatsapp_phone-index", "whatsapp_phone")
    add_gsi(orders_table, "email-index", "email")

    print(f"\nPayments table: {payments_table}")
    add_gsi(payments_table, "order_id-index", "order_id")

    print("\nDone.")

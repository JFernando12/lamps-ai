#!/usr/bin/env python3
"""Create all DynamoDB tables required by Lamps AI.

Usage:
    uv run python scripts/create_tables.py

The script is idempotent: running it multiple times is safe.
"""

import sys
from pathlib import Path

# Ensure backend/ is on the path so `app` is importable when running
# this script from within the scripts/ subdirectory.
sys.path.insert(0, str(Path(__file__).parent.parent))

import boto3
from botocore.exceptions import ClientError
from app import config

client = boto3.client(
    "dynamodb",
    region_name=config.AWS_REGION,
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
)

TABLES = [
    # ── Users ────────────────────────────────────────────────────────────────
    {
        "TableName": config.DYNAMO_TABLE_USERS,
        "KeySchema": [
            {"AttributeName": "email", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "email", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },

    # ── Photos ───────────────────────────────────────────────────────────────
    # Primary key : photo_id (uuid) — customer uploads, no AI processing
    {
        "TableName": config.DYNAMO_TABLE_PHOTOS,
        "KeySchema": [
            {"AttributeName": "photo_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "photo_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },

    # ── Orders ───────────────────────────────────────────────────────────────
    # Primary key : order_id (uuid)
    # GSI         : user_email → list all orders by registered user
    # GSI         : whatsapp_phone → list agent orders by WhatsApp number
    {
        "TableName": config.DYNAMO_TABLE_ORDERS,
        "KeySchema": [
            {"AttributeName": "order_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "order_id",       "AttributeType": "S"},
            {"AttributeName": "user_email",     "AttributeType": "S"},
            {"AttributeName": "whatsapp_phone", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "email-index",
                "KeySchema": [
                    {"AttributeName": "user_email", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "whatsapp_phone-index",
                "KeySchema": [
                    {"AttributeName": "whatsapp_phone", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    },

    # ── Carts (abandoned checkout drafts) ────────────────────────
    # Primary key : cart_id (uuid)
    # TTL         : expires_ttl — DynamoDB auto-deletes carts after 30 days
    {
        "TableName": config.DYNAMO_TABLE_CARTS,
        "KeySchema": [
            {"AttributeName": "cart_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "cart_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },

    # ── Email Campaigns ──────────────────────────────────────────
    # Primary key : campaign_id (uuid)
    {
        "TableName": config.DYNAMO_TABLE_EMAIL_CAMPAIGNS,
        "KeySchema": [
            {"AttributeName": "campaign_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "campaign_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
    # ── Designs (agent AI jobs) ─────────────────────────────────────────
    # Primary key : design_id (dsn_{uuid})
    {
        "TableName": config.DYNAMO_TABLE_DESIGNS,
        "KeySchema": [
            {"AttributeName": "design_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "design_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },

    # ── Payments (MercadoPago link registry) ─────────────────────────
    # Primary key : payment_id
    # GSI         : order_id       → lookup all payments for an order
    # GSI         : whatsapp_phone → lookup payments by customer WhatsApp
    {
        "TableName": config.DYNAMO_TABLE_PAYMENTS,
        "KeySchema": [
            {"AttributeName": "payment_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "payment_id",     "AttributeType": "S"},
            {"AttributeName": "order_id",       "AttributeType": "S"},
            {"AttributeName": "whatsapp_phone", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
        "GlobalSecondaryIndexes": [
            {
                "IndexName": "order_id-index",
                "KeySchema": [
                    {"AttributeName": "order_id", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
            {
                "IndexName": "whatsapp_phone-index",
                "KeySchema": [
                    {"AttributeName": "whatsapp_phone", "KeyType": "HASH"},
                ],
                "Projection": {"ProjectionType": "ALL"},
            },
        ],
    },

    # ── Site Config (single-item settings store) ──────────────────────
    # Partition key : setting_id  (always "general")
    {
        "TableName": config.DYNAMO_TABLE_CONFIG,
        "KeySchema": [
            {"AttributeName": "setting_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "setting_id", "AttributeType": "S"},
        ],
        "BillingMode": "PAY_PER_REQUEST",
    },
]


def table_exists(name: str) -> bool:
    try:
        client.describe_table(TableName=name)
        return True
    except client.exceptions.ResourceNotFoundException:
        return False


def wait_active(name: str) -> None:
    print(f"  Waiting for '{name}' to become ACTIVE...", end=" ", flush=True)
    waiter = client.get_waiter("table_exists")
    waiter.wait(TableName=name)
    print("done.")


def enable_ttl(name: str, attr: str) -> None:
    try:
        client.update_time_to_live(
            TableName=name,
            TimeToLiveSpecification={"AttributeName": attr, "Enabled": True},
        )
        print(f"  TTL enabled on '{name}' (attribute: {attr})")
    except ClientError as e:
        # ValidationException is raised if TTL is already enabled — safe to ignore
        if e.response["Error"]["Code"] != "ValidationException":
            print(f"  Warning: could not enable TTL on '{name}': {e}", file=sys.stderr)


def create_tables() -> None:
    print(f"Region  : {config.AWS_REGION}")
    print(f"Tables  : {config.DYNAMO_TABLE_USERS}, {config.DYNAMO_TABLE_PHOTOS}, "
          f"{config.DYNAMO_TABLE_ORDERS}, {config.DYNAMO_TABLE_CARTS}, "
          f"{config.DYNAMO_TABLE_EMAIL_CAMPAIGNS}, {config.DYNAMO_TABLE_DESIGNS}, "
          f"{config.DYNAMO_TABLE_PAYMENTS}")
    print()

    for schema in TABLES:
        name = schema["TableName"]
        if table_exists(name):
            print(f"[skip]   '{name}' already exists.")
            continue

        print(f"[create] '{name}'...")
        try:
            client.create_table(**schema)
            wait_active(name)
            # Enable TTL for the carts table after it becomes active
            if name == config.DYNAMO_TABLE_CARTS:
                enable_ttl(name, "expires_ttl")
            print(f"[ok]     '{name}' created.")
        except ClientError as e:
            print(f"[error]  '{name}': {e.response['Error']['Message']}", file=sys.stderr)
            sys.exit(1)

    print("\nAll tables are ready.")


if __name__ == "__main__":
    create_tables()

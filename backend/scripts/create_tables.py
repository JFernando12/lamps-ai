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

    # ── Previews ─────────────────────────────────────────────────────────────
    # GSI         : user_email → list all previews by user
    {
        "TableName": config.DYNAMO_TABLE_PREVIEWS,
        "KeySchema": [
            {"AttributeName": "preview_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "preview_id", "AttributeType": "S"},
            {"AttributeName": "user_email",  "AttributeType": "S"},
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
        ],
    },

    # ── Orders ───────────────────────────────────────────────────────────────
    # Primary key : order_id (uuid)
    # GSI         : user_email → list all orders by user
    {
        "TableName": config.DYNAMO_TABLE_ORDERS,
        "KeySchema": [
            {"AttributeName": "order_id", "KeyType": "HASH"},
        ],
        "AttributeDefinitions": [
            {"AttributeName": "order_id",   "AttributeType": "S"},
            {"AttributeName": "user_email", "AttributeType": "S"},
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
        ],
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


def create_tables() -> None:
    print(f"Region  : {config.AWS_REGION}")
    print(f"Tables  : {config.DYNAMO_TABLE_USERS}, {config.DYNAMO_TABLE_PREVIEWS}, {config.DYNAMO_TABLE_ORDERS}")
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
            print(f"[ok]     '{name}' created.")
        except ClientError as e:
            print(f"[error]  '{name}': {e.response['Error']['Message']}", file=sys.stderr)
            sys.exit(1)

    print("\nAll tables are ready.")


if __name__ == "__main__":
    create_tables()

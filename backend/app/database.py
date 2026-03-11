"""DynamoDB client and table helpers."""
import boto3
from . import config

_dynamo = boto3.resource(
    "dynamodb",
    region_name=config.AWS_REGION,
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
)


def get_table(name: str):
    return _dynamo.Table(name)


def users_table():
    return get_table(config.DYNAMO_TABLE_USERS)


def photos_table():
    return get_table(config.DYNAMO_TABLE_PHOTOS)


def orders_table():
    return get_table(config.DYNAMO_TABLE_ORDERS)


def carts_table():
    return get_table(config.DYNAMO_TABLE_CARTS)


def email_campaigns_table():
    return get_table(config.DYNAMO_TABLE_EMAIL_CAMPAIGNS)


def designs_table():
    return get_table(config.DYNAMO_TABLE_DESIGNS)


def payments_table():
    return get_table(config.DYNAMO_TABLE_PAYMENTS)

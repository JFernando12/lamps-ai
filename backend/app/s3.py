"""S3 client and upload/URL helpers."""
import boto3
from . import config

_s3 = boto3.client(
    "s3",
    region_name=config.AWS_REGION,
    aws_access_key_id=config.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
)


def upload_bytes(data: bytes, key: str, content_type: str = "image/png") -> str:
    """Upload raw bytes to S3 and return the S3 key."""
    _s3.put_object(
        Bucket=config.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=content_type,
    )
    return key


def upload_preview(data: bytes, preview_id: str, suffix: str = "png") -> str:
    """Upload a preview image and return its S3 key."""
    key = f"previews/{preview_id}.{suffix}"
    return upload_bytes(data, key, content_type=f"image/{suffix}")


def upload_upload(data: bytes, preview_id: str, suffix: str = "png") -> str:
    """Upload the original user-uploaded image and return its S3 key."""
    key = f"uploads/{preview_id}_original.{suffix}"
    return upload_bytes(data, key, content_type=f"image/{suffix}")


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    """Return a presigned URL for reading an S3 object."""
    return _s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": config.S3_BUCKET, "Key": key},
        ExpiresIn=expires_in,
    )

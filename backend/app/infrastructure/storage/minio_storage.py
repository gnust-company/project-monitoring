"""ObjectStorage qua MinIO (S3-compatible) bằng aioboto3.

Bucket được tạo sẵn bởi service `minio-setup` trong docker-compose và đặt
chế độ download công khai, nên `public_url` tải trực tiếp được.
"""
import aioboto3

from app.application.ports import ObjectStorage
from app.core.config import Settings


class MinioStorage(ObjectStorage):
    def __init__(self, settings: Settings) -> None:
        self._endpoint = settings.minio_endpoint
        self._public = settings.minio_public_url.rstrip("/")
        self._access = settings.minio_access_key
        self._secret = settings.minio_secret_key
        self._region = settings.minio_region
        self._session = aioboto3.Session()

    def _client(self):
        return self._session.client(
            "s3",
            endpoint_url=self._endpoint,
            aws_access_key_id=self._access,
            aws_secret_access_key=self._secret,
            region_name=self._region,
        )

    async def put(self, bucket: str, key: str, data: bytes, content_type: str) -> str:
        async with self._client() as s3:
            await s3.put_object(Bucket=bucket, Key=key, Body=data, ContentType=content_type)
        return self.public_url(bucket, key)

    async def delete(self, bucket: str, key: str) -> None:
        async with self._client() as s3:
            await s3.delete_object(Bucket=bucket, Key=key)

    def public_url(self, bucket: str, key: str) -> str:
        return f"{self._public}/{bucket}/{key}"

    def key_from_url(self, bucket: str, url: str) -> str | None:
        marker = f"/{bucket}/"
        idx = url.find(marker)
        return url[idx + len(marker):] if idx != -1 else None

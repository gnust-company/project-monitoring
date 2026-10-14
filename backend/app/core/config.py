"""Cấu hình ứng dụng — nguồn duy nhất là file `.env` ở GỐC repo (copy từ `.env.example`).

- Chạy bằng docker compose: mọi service nhận `.env` qua `env_file` (compose không còn
  khối `environment:` riêng).
- Chạy backend ngoài docker: đọc thẳng `<repo>/.env` (bất kể đứng ở thư mục nào).
  Biến môi trường của shell ghi đè giá trị trong file — dùng để trỏ host sang localhost.

Biến phụ thuộc môi trường (DB, MinIO, JWT, CORS) **bắt buộc** — thiếu là báo lỗi ngay lúc
khởi động thay vì âm thầm dùng giá trị mặc định.
"""
from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

# backend/app/core/config.py → parents[3] = gốc repo. Trong container đường dẫn này không
# tồn tại → pydantic bỏ qua, chỉ dùng biến môi trường do compose nạp từ env_file.
REPO_ENV_FILE = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    # extra="ignore": .env dùng chung cho cả compose/frontend (cổng, VITE_API_BASE…).
    model_config = SettingsConfigDict(
        env_file=REPO_ENV_FILE, env_file_encoding="utf-8", extra="ignore",
    )

    # ── Postgres — dùng chung tên biến với container postgres ──
    postgres_user: str
    postgres_password: str
    postgres_db: str
    # host[:port] backend kết nối tới. Trong docker = tên service "postgres" (cổng nội bộ
    # 5432); chạy ngoài docker = "localhost:<POSTGRES_PORT>".
    postgres_host: str
    # Tuỳ chọn: chuỗi kết nối đầy đủ, ghi đè các biến POSTGRES_* ở trên (DB đặc biệt).
    database_url_override: str = Field(default="", validation_alias="DATABASE_URL")

    # ── Auth ──
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: str

    # Allowlist domain email (#5): CSV, vd "company.com, company.vn".
    # Rỗng = không giới hạn (backward-compatible). KHÔNG áp cho /auth/setup.
    allowed_email_domains: str = ""

    # ── MinIO / object storage (S3-compatible) — dùng chung credential với container minio ──
    minio_endpoint: str  # backend → MinIO (trong docker: http://minio:9000)
    minio_public_url: str  # trình duyệt → MinIO (host/IP thật)
    minio_access_key: str = Field(validation_alias="MINIO_ROOT_USER")
    minio_secret_key: str = Field(validation_alias="MINIO_ROOT_PASSWORD")
    minio_region: str = "us-east-1"
    minio_bucket_attachments: str = "attachments"
    minio_bucket_avatars: str = "avatars"

    @property
    def database_url(self) -> str:
        if self.database_url_override:
            return self.database_url_override
        host, _, port = self.postgres_host.partition(":")
        return URL.create(
            "postgresql+asyncpg",
            username=self.postgres_user,
            password=self.postgres_password,
            host=host,
            port=int(port) if port else 5432,
            database=self.postgres_db,
        ).render_as_string(hide_password=False)

    @property
    def allowed_email_domain_list(self) -> list[str]:
        """Domain dạng thường, bỏ dấu @ thừa, lọc rỗng."""
        out: list[str] = []
        for raw in self.allowed_email_domains.split(","):
            d = raw.strip().lower().lstrip("@")
            if d:
                out.append(d)
        return out

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # giá trị bắt buộc đến từ env/.env

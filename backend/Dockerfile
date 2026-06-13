# ProjectHub backend — FastAPI + uv
FROM python:3.12-slim

# uv: trình quản lý gói/venv nhanh
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PATH="/app/.venv/bin:$PATH"

WORKDIR /app

# Cài deps trước (tận dụng layer cache) — chỉ copy manifest
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-install-project --no-dev

# Copy mã nguồn
COPY . .
RUN uv sync --no-dev

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

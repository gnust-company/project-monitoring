#!/bin/sh
# Sinh runtime-env.js từ biến môi trường lúc container KHỞI ĐỘNG (không phải lúc build).
# Đặt trong /docker-entrypoint.d/ → nginx:alpine tự chạy trước khi start nginx.
# Đổi API base URL chỉ cần đặt lại biến VITE_API_BASE và restart container.
set -e

CONFIG_FILE="/usr/share/nginx/html/runtime-env.js"

if [ -n "${VITE_API_BASE}" ]; then
  printf 'window.__RUNTIME_CONFIG__ = { API_BASE: "%s" };\n' "${VITE_API_BASE}" > "${CONFIG_FILE}"
  echo "[runtime-env] API_BASE=${VITE_API_BASE}"
else
  printf 'window.__RUNTIME_CONFIG__ = {};\n' > "${CONFIG_FILE}"
  echo "[runtime-env] VITE_API_BASE chưa đặt → dùng mặc định trong bundle"
fi

# ProjectHub frontend — build bằng Node, serve tĩnh bằng nginx
FROM node:24-alpine AS build
WORKDIR /app

# VITE_API_BASE lúc build chỉ là GIÁ TRỊ MẶC ĐỊNH (fallback). URL thật được cấu hình
# lúc CHẠY qua runtime-env.sh — đổi IP/port không cần build lại image.
ARG VITE_API_BASE=http://localhost:8000/api/v1
ENV VITE_API_BASE=$VITE_API_BASE

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# SPA fallback: mọi route → index.html
RUN printf 'server {\n  listen 80;\n  location / {\n    root /usr/share/nginx/html;\n    try_files $uri $uri/ /index.html;\n  }\n}\n' > /etc/nginx/conf.d/default.conf
# Sinh runtime-env.js từ biến môi trường lúc khởi động (nginx:alpine tự chạy các
# script trong /docker-entrypoint.d/ trước khi start) → đổi API URL không cần build lại.
COPY runtime-env.sh /docker-entrypoint.d/40-runtime-env.sh
RUN chmod +x /docker-entrypoint.d/40-runtime-env.sh
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

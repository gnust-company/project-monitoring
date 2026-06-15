// Cấu hình đọc lúc CHẠY (không phải lúc build). Trong production, file này được
// container nginx ghi đè từ biến môi trường VITE_API_BASE (xem frontend/runtime-env.sh).
// Để trống ở dev → app dùng import.meta.env.VITE_API_BASE / giá trị mặc định.
window.__RUNTIME_CONFIG__ = {};

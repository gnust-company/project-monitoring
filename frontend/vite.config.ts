import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: '/',
  // Đọc `.env` ở GỐC repo (nguồn cấu hình duy nhất). Vite chỉ đưa biến VITE_* ra trình duyệt.
  envDir: path.resolve(__dirname, '..'),
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

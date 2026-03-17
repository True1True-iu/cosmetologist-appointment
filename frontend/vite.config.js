import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Простая конфигурация Vite для React-проекта
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
  }
});


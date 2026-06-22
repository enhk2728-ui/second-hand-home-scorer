import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/second-hand-home-scorer/",
  plugins: [react()],
  build: {
    outDir: "docs",
    emptyOutDir: false
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});

import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./", import.meta.url)) },
  },
  // le o .env pros testes de integracao acharem o DATABASE_URL_TESTE
  test: { env: loadEnv("", process.cwd(), "") },
});

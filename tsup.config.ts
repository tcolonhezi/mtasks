import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  clean: true,
  outDir: "dist",
  skipNodeModulesBundle: true, // Impede que pacotes do node_modules sejam empacotados
});

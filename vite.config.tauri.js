import { defineConfig, mergeConfig } from "vite";
import baseViteConfig from "./vite.config";
import tauri from "vite-plugin-tauri";

export default defineConfig(
  mergeConfig(baseViteConfig, {
    plugins: [tauri()],

    // optional but recommended
    clearScreen: false,
    server: {
      open: false,
    },
  }),
);
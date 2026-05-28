import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.BASE_PATH ?? "/hex-stats/",
  build: {
    target: "es2022",
    sourcemap: true,
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { componentTagger } from "lovable-tagger";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 4000,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // No "radix" bucket: grouping every primitive into one chunk meant
        // a page that used a tooltip also downloaded accordion, dialog,
        // select and the rest. Rollup splits them per-route on its own.
        manualChunks: {
          "react-query": ["@tanstack/react-query"],
        },
      },
    },
    cssCodeSplit: true,
  },
}));

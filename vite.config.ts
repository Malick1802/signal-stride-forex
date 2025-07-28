import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Fresh cache after removing @radix-ui/react-tooltip package
  cacheDir: `node_modules/.vite-cache-CLEAN-${Date.now()}`,
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom']
  },
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2015',
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode === 'development',
    // COMPLETELY REMOVE MANUAL CHUNKING TO AVOID TOOLTIP ISSUES
    rollupOptions: {},
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    } : undefined,
  },
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Force complete cache rebuild to eliminate TooltipProvider issue
  cacheDir: 'node_modules/.vite-cache-tooltip-fix-v3',
  server: {
    host: "::",
    port: 8080,
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', 'recharts'],
    exclude: ['@radix-ui/react-tooltip']
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
    // Optimize for mobile app
    target: 'es2015',
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode === 'development',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast'],
        }
      }
    },
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    } : undefined,
  },
}));

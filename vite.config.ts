
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Removed componentTagger as it's a Lovable-specific dev tool
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize for mobile app with better compatibility
    target: 'es2020',
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: mode === 'development',
    // Ensure assets are properly resolved for mobile
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast'],
          router: ['react-router-dom'],
        }
      }
    },
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: false, // Keep console logs for mobile debugging
        drop_debugger: true,
      },
    } : undefined,
  },
}));

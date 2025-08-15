import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Android-specific Vite configuration
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    minify: 'terser',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        android: path.resolve(__dirname, 'android.html')
      },
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          auth: ['@supabase/supabase-js'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-toast']
        }
      }
    },
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: true,
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@capacitor/core']
  }
});
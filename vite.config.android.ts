import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// Android-specific Vite configuration
export default defineConfig(({ mode }) => ({
  // Ensure relative asset paths for Capacitor (file://)
  base: '',
  // Android-specific cache to avoid conflicts
  cacheDir: `node_modules/.vite-cache-android`,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    minify: mode === 'production' ? 'terser' : false,
    sourcemap: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'android.html'),
      output: {
        entryFileNames: 'assets/main-android.js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    terserOptions: mode === 'production' ? {
      compress: {
        drop_console: false, // Keep console logs for Android debugging
        drop_debugger: true,
      },
    } : undefined,
  },
  optimizeDeps: {
    force: true,
    include: ['react', 'react-dom', '@capacitor/core', '@capacitor/app']
  }
}));
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // Stockfish WASM files are served as static assets from /public.
  // Exclude the package from pre-bundling — it is not a standard ES module.
  optimizeDeps: {
    exclude: ['stockfish'],
  },
  worker: {
    // Use classic (IIFE) format so importScripts() works inside workers.
    // ES module workers cannot use importScripts().
    format: 'iife',
  },
})

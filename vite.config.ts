
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3001, // lock to 3001 since 3000 is busy
    strictPort: true, // fail if 3001 is busy instead of silently changing
    host: true, // bind to 0.0.0.0 to allow LAN access
    open: true, // open browser automatically
  },
  build: {
    outDir: 'build',
  },
});
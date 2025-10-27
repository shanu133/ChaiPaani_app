
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3010, // Changed to 3010 for local testing
      strictPort: true, // fail if 3010 is busy instead of silently changing
      host: true, // bind to 0.0.0.0 to allow LAN access
      open: true, // open browser automatically
    },
    build: {
      outDir: 'build',
    },
    define: {
      // Pass all env variables to the client-side code
      'import.meta.env': JSON.stringify(env),
    },
  };
});
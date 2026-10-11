import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = process.env.API_PORT || env.VITE_API_PORT || '4043';
  const apiTarget = env.VITE_API_TARGET || `http://localhost:${apiPort}`;
  const webPort = Number(process.env.WEB_PORT || env.VITE_PORT || 3000);

  return {
    plugins: [react()],
    server: {
      port: webPort,
      allowedHosts: true,
      watch: { usePolling: true, interval: 1000 },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
          timeout: 300000,
        },
      },
    },
  };
});

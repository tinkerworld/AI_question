import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiPort = env.VITE_API_PORT || env.PORT || process.env.API_PORT || process.env.PORT || '4044';
  const apiTarget = env.VITE_API_TARGET || `http://localhost:${apiPort}`;
  const webPort = Number(env.VITE_PORT || env.PORT || process.env.WEB_PORT || 3002);

  return {
    plugins: [react()],
    server: {
      port: webPort,
      allowedHosts: true,
      watch: {
        usePolling: true,
        interval: 1000,
      },
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  };
});


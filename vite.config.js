import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const huntBaseUrl = env.VITE_HUNT_AI_BASE_URL || 'http://localhost:11434';

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/hunt-ai': {
          target: huntBaseUrl,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/hunt-ai/, ''),
        },
      },
    },
  };
})

import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { zhongxueApiPlugin } from './src/viteApiPlugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    plugins: [react(), zhongxueApiPlugin()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      watch: {
        ignored: ['**/data/dictionary/**', '**/.data/**', '**/coverage/**', '**/playwright-report/**']
      }
    },
    test: {
      include: ['tests/domain*.test.ts'],
      coverage: { include: ['src/domain/**'], reporter: ['text', 'html'] }
    }
  };
});


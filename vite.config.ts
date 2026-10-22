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
      include: ['tests/**/*.test.ts'],
      coverage: {
        include: ['src/domain/**', 'src/services/**', 'server/**'],
        reporter: ['text', 'html'],
        thresholds: {
          lines: 80,
          functions: 80,
          branches: 80,
          statements: 80
        }
      }
    }
  };
});


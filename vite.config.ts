import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],test:{include:['tests/domain*.test.ts'],coverage:{include:['src/domain/**'],reporter:['text','html']}}});

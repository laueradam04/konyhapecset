import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' – így a build bármilyen almappából és statikus tárhelyről is fut.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['src/**/*.test.ts'],
  },
});

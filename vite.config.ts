import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base: './' – így a build bármilyen almappából és statikus tárhelyről is fut.
// `vite build --mode demo`: a betűtípusokat a CSS-be ágyazza, hogy szigorú
// tartalombiztonsági szabályok mellett (beágyazott demó) is betöltődjenek.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  build: {
    assetsInlineLimit: mode === 'demo' ? 200_000 : 4096,
    outDir: mode === 'demo' ? 'dist-demo' : 'dist',
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}));

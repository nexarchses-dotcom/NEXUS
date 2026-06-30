import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' so assets resolve under the GitHub Pages project subpath.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'dist' }
});

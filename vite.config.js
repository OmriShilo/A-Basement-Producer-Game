import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  /* Relative asset paths, so the same build works wherever it is mounted.
     GitHub Pages serves a project repo from a SUBPATH
     (omrishilo.github.io/A-Basement-Producer-Game/) but a custom domain from
     the root. Root-absolute paths would 404 on the first and relative ones
     work on both, which means the github.io URL is usable immediately rather
     than only after DNS has propagated. */
  base: './',
  plugins: [react()],
  server: { port: 5273, strictPort: true },
});

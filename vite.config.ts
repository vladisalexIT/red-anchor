import { defineConfig } from 'vite';
import vituum from 'vituum';
import nunjucks from '@vituum/vite-plugin-nunjucks';

export default defineConfig({
  plugins: [
    vituum(),
    nunjucks({
      root: './src',
    }),
  ],

  server: {
    open: true,
  },

  preview: {
    open: true,
  },

  build: {
    emptyOutDir: true,
  },
});

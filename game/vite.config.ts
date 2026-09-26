import { defineConfig } from 'vite';
export default defineConfig({
  base: './', server: { proxy: { '/api': 'http://127.0.0.1:8100' } },
  build: { rollupOptions: { input: { main: 'index.html', forest: 'forest.html', winter: 'winter.html' } } },
});

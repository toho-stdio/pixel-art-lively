import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  build: { rollupOptions: { input: {
    main: fileURLToPath(new URL('./index.html', import.meta.url)),
    study: fileURLToPath(new URL('./study.html', import.meta.url)),
    direction: fileURLToPath(new URL('./direction.html', import.meta.url)),
  } } },
});

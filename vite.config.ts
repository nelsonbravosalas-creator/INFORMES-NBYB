import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

const isSingleFile = process.env.BUILD_TARGET === 'singlefile';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      ...(isSingleFile ? [viteSingleFile()] : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    ...(isSingleFile ? {
      base: './',
      build: {
        outDir: 'dist-mobile',
        assetsInlineLimit: 100_000_000,
        cssCodeSplit: false,
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
      },
    } : {}),
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

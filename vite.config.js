import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
    plugins: [svelte()],
    base: '/lightmap/',
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts'],
    },
});

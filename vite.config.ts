import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { execSync } from 'child_process';

function getGitVersion(): string {
    try {
        // Get the most recent tag, or fall back to 'dev' if no tags exist
        return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
    } catch {
        return 'dev';
    }
}

export default defineConfig({
    plugins: [svelte()],
    define: {
        __APP_VERSION__: JSON.stringify(getGitVersion()),
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts'],
    },
});

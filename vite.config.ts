import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { checker } from 'vite-plugin-checker';
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
    base: '',
    plugins: [
        svelte(),
        {
            name: 'strip-dot-slash-prefix',
            apply: 'build',
            transformIndexHtml(html) {
                return html.replace(/(["'=])\.\/(?!\/)/g, '$1');
            },
        },
        checker({
            typescript: true,
            eslint: {
                lintCommand: 'eslint .',
            },
        }),
    ],
    define: {
        __APP_VERSION__: JSON.stringify(getGitVersion()),
    },
    test: {
        environment: 'jsdom',
        globals: true,
        include: ['tests/**/*.test.ts'],
    },
});

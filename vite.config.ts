import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// `process` is provided by the Node context Vite runs in. Declared locally so we
// don't have to add @types/node — keeping the dependency surface minimal.
declare const process: { env: Record<string, string | undefined> };

// Allow overriding the dev/preview port via PORT (handy for containers/hosting);
// falls back to Vite's default 5173.
const port = process.env.PORT ? Number(process.env.PORT) : 5173;

export default defineConfig({
	plugins: [sveltekit()],
	server: { port },
	preview: { port }
});

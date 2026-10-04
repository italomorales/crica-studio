import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => ({
    server: {
        host: '0.0.0.0',
        port: 4173,
        allowedHosts: true,
        proxy: {
            '/api': loadEnv(mode, process.cwd(), '').CRICA_API_PROXY || 'http://localhost:5030',
        },
    },
    build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
}));

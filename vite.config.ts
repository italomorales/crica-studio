import { defineConfig } from 'vite';
export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 4173,
        allowedHosts: true,
        proxy: {
            '/api': 'http://localhost:5030',
        },
    },
    build: { outDir: 'dist', chunkSizeWarningLimit: 1500 },
});

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
    base: process.env.ELECTRON === 'true' ? './' : '/', // Relative path for Electron, absolute path for web
    plugins: [react()],
    define: {
        'process.env': {} // Shim for libraries that expect process.env
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})

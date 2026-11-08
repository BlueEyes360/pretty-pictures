import { preview } from 'vite';

await preview({ configFile: false, base: '/pretty-pictures/', build: { outDir: 'build-pages' }, preview: { host: '127.0.0.1', port: Number(process.argv[2]), strictPort: true } });

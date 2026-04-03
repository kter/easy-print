import { build } from 'esbuild';
import { mkdirSync, copyFileSync } from 'fs';
import { createRequire } from 'module';

const isEdge = process.argv.includes('--edge');
const apiBaseUrl = process.argv.find((a) => a.startsWith('--api-base-url='))?.split('=').slice(1).join('=') ?? process.env.API_BASE_URL ?? '';

const entryPoint = isEdge ? 'src/ogp-edge.ts' : 'src/handler.ts';
const outdir = isEdge ? 'dist-edge' : 'dist';

mkdirSync(outdir, { recursive: true });

// Edge uses ESM (CloudFront Lambda@Edge requirement); main handler uses CJS
const format = isEdge ? 'esm' : 'cjs';

await build({
  entryPoints: [entryPoint],
  bundle: true,
  platform: 'node',
  target: 'node22',
  format,
  outdir,
  external: ['@aws-sdk/*'],
  define: isEdge && apiBaseUrl ? { 'process.env.API_BASE_URL': JSON.stringify(apiBaseUrl) } : {},
  minify: process.env.NODE_ENV === 'production',
  sourcemap: process.env.NODE_ENV !== 'production',
  banner: isEdge
    ? { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" }
    : {},
});

// jsdom loads xhr-sync-worker.js as a Worker thread via require.resolve('./xhr-sync-worker.js').
// Since esbuild can't bundle worker files, copy it alongside the bundle so the path resolves.
if (!isEdge) {
  const require = createRequire(import.meta.url);
  const workerSrc = require.resolve('jsdom/lib/jsdom/living/xhr/xhr-sync-worker.js');
  copyFileSync(workerSrc, `${outdir}/xhr-sync-worker.js`);
}

console.log(`Built ${outdir}/${isEdge ? 'ogp-edge' : 'handler'}.js`);

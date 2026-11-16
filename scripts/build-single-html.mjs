import fs from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';

const rootDir = process.cwd();
const distAssetsDir = path.join(rootDir, 'dist', 'assets');

if (!fs.existsSync(distAssetsDir)) {
  throw new Error('Missing dist/assets. Run `npm run build` first so Tailwind CSS is compiled.');
}

const cssFile = fs
  .readdirSync(distAssetsDir)
  .find((file) => file.endsWith('.css'));

if (!cssFile) {
  throw new Error('Could not find compiled CSS in dist/assets.');
}

const cssContent = fs
  .readFileSync(path.join(distAssetsDir, cssFile), 'utf8')
  .replace(/<\/style/gi, '<\\/style');

const result = buildSync({
  entryPoints: [path.join(rootDir, 'src', 'main.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  write: false,
  loader: {
    '.css': 'empty',
  },
  define: {
    'process.env.NODE_ENV': '"production"',
  },
});

const jsContent = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const html = `<!doctype html>
<html lang="vi" data-theme="cyber">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lucky Wheel & Prize Award Studio — Vòng Quay May Mắn Sự Kiện</title>
    <meta
      name="description"
      content="Ứng dụng vòng quay may mắn và trao thưởng sự kiện hiện đại tích hợp cơ sở dữ liệu đám mây."
    />
    <meta property="og:title" content="Lucky Wheel & Prize Award Studio" />
    <meta
      property="og:description"
      content="Ứng dụng vòng quay may mắn và trao thưởng sự kiện hiện đại tích hợp cơ sở dữ liệu đám mây."
    />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
      rel="stylesheet"
    />
    <style>${cssContent}</style>
  </head>
  <body>
    <div id="root"></div>
    <script defer>${jsContent}</script>
  </body>
</html>
`;

fs.writeFileSync(path.join(rootDir, 'index.html'), html, 'utf8');
console.log(`Generated single-file index.html (${Math.round(Buffer.byteLength(html, 'utf8') / 1024)} KB)`);

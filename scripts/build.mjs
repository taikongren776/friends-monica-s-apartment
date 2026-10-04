import { build } from 'esbuild';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = await build({
  entryPoints: [path.join(root, 'src/scene.js')],
  bundle: true,
  minify: true,
  format: 'iife',
  target: ['chrome100', 'firefox100', 'safari16'],
  legalComments: 'inline',
  write: false,
});
const [template, style, threeLicense] = await Promise.all([
  readFile(path.join(root, 'src/page.html'), 'utf8'),
  readFile(path.join(root, 'src/style.css'), 'utf8'),
  readFile(path.join(root, 'node_modules/three/LICENSE'), 'utf8'),
]);
const script = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
// Callbacks preserve literal dollar sequences in bundled code (e.g. shader/string replacements).
const html = template
  .replace('<!-- INLINE_THREE_LICENSE -->', () => `<!--\nThree.js and its addons:\n${threeLicense}\n-->`)
  .replace('/* INLINE_STYLE */', () => style)
  .replace('/* INLINE_SCRIPT */', () => script);
await writeFile(path.join(root, 'index.html'), html, 'utf8');
console.log(`Built offline index.html (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);

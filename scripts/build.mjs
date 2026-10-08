import { copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(resolve(root, file), 'utf8');
const encode = value => JSON.stringify(value).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
const portraits = {};
for (let i = 1; i <= 8; i++) {
  const path = `assets/portrait-${i}.svg`;
  portraits[path] = `data:image/svg+xml;base64,${Buffer.from(read(path)).toString('base64')}`;
}
let css = read('style.css');
for (const file of ['cursor-arrow.svg', 'cursor-cross.svg']) {
  const uri = `data:image/svg+xml;base64,${Buffer.from(read(`assets/${file}`)).toString('base64')}`;
  css = css.replaceAll(`assets/${file}`, uri);
}
let app = read('app.js')
  .replaceAll('img.src=r.image;', 'img.src=BUNDLED_PORTRAITS[r.image]||r.image;')
  .replace("$('#detail-image').src=r.image;", "$('#detail-image').src=BUNDLED_PORTRAITS[r.image]||r.image;")
  .replace('async function loadCopy(){', 'async function loadCopy(){publishedCopy=validateCopy(BUNDLED_COPY);')
  .replace('records=[];demo=false;render()', 'records=validate(BUNDLED_ARCHIVE);demo=false;render()')
  .replace('Promise.all([loadCopy(),init()]);', "siteCopy=validateCopy(BUNDLED_COPY);records=validate(BUNDLED_ARCHIVE);demo=records.some(r=>r.id.startsWith('sample-'));render();Promise.all([loadCopy(),init()]);");
app = `const BUNDLED_PORTRAITS=${encode(portraits)};\nconst BUNDLED_ARCHIVE=${encode(JSON.parse(read('archive.json')))};\nconst BUNDLED_COPY=${encode(JSON.parse(read('settings.json')))};\n${app}`;
app = app.replaceAll('</script', '<\\/script');
const hash = text => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const csp = `default-src 'self'; script-src 'self' ${hash(app)}; style-src 'self' ${hash(css)}; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`;
const html = read('src/index.html')
  .replace(/<link rel="stylesheet" href="[^"]+">/, `<style>${css}</style>`)
  .replace(/<script src="[^"]+" defer><\/script>/, '')
  .replace('</body>', `<script>${app}</script></body>`);
const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`;
writeFileSync(resolve(root, 'index.html'), html);
writeFileSync(resolve(root, '_headers'), headers);
const output = resolve(root, 'dist');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'archive.json', 'settings.json', '_headers', '.nojekyll']) {
  copyFileSync(resolve(root, file), resolve(output, file));
}
console.log('Built self-contained index.html and dist/: CSS, JavaScript, sample portraits, cursors, and fallback data are embedded.');

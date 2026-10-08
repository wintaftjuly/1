import { cpSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
const fontFile = 'assets/fonts/PretendardVariable.woff2';
css = css.replaceAll(fontFile, `data:font/woff2;base64,${readFileSync(resolve(root, fontFile)).toString('base64')}`);
const spineFont = 'assets/fonts/Transcity-Regular.otf';
css = css.replaceAll(spineFont, `data:font/otf;base64,${readFileSync(resolve(root, spineFont)).toString('base64')}`);
const cursorData = file => `data:image/svg+xml;base64,${Buffer.from(read(file)).toString('base64')}`;
const cursors = {
  arrow: cursorData('assets/cursors/left_ptr.svg'),
  hand: cursorData('assets/cursors/hand2.svg'),
  text: cursorData('assets/cursors/xterm.svg'),
  wait: Array.from({ length: 40 }, (_, i) => cursorData(`assets/cursors/wait/wait-${String(i+1).padStart(2,'0')}.svg`)),
};
for (const file of ['left_ptr.svg', 'hand2.svg', 'xterm.svg']) {
  css = css.replaceAll(`assets/cursors/${file}`, cursorData(`assets/cursors/${file}`));
}
const mediaValidation = read('shared/media.mjs').replaceAll('export function ', 'function ');
let app = (mediaValidation + '\n' + read('app.js') + '\n' + read('publish.js') + '\n' + read('audio.js') + '\n' + read('spine.js') + '\n' + read('cursor.js'))
  .replaceAll('img.src=r.image;', 'img.src=BUNDLED_PORTRAITS[r.image]||r.image;')
  .replace("$('#detail-image').src=r.image;", "$('#detail-image').src=BUNDLED_PORTRAITS[r.image]||r.image;")
  .replace('async function loadCopy(){', 'async function loadCopy(){publishedCopy=validateCopy(BUNDLED_COPY);')
  .replace('records=samples;demo=true;render()', "records=validate(BUNDLED_ARCHIVE);demo=records.some(r=>r.id.startsWith('sample-'));render()")
  .replace('Promise.all([loadCopy(),init()]);', "siteCopy=validateCopy(BUNDLED_COPY);records=validate(BUNDLED_ARCHIVE);demo=records.some(r=>r.id.startsWith('sample-'));render();Promise.all([loadCopy(),init()]);");
app = `const BUNDLED_CURSORS=${encode(cursors)};\nconst BUNDLED_PORTRAITS=${encode(portraits)};\nconst BUNDLED_ARCHIVE=${encode(JSON.parse(read('archive.json')))};\nconst BUNDLED_COPY=${encode(JSON.parse(read('settings.json')))};\n${app}`;
app = app.replaceAll('</script', '<\\/script');
const hash = text => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const favicon = `data:image/svg+xml;base64,${Buffer.from(read('favicon.svg')).toString('base64')}`;
const editorTemplate = read('src/index.html');
let publicTemplate = editorTemplate
 .replace(/<div class="header-actions">[\s\S]*?<\/div>/, '')
 .replace(/<button id="edit-selected"[\s\S]*?<\/button>/, '')
 .replace(/<dialog id="(?:manager|editor|publish-dialog)"[\s\S]*?<\/dialog>/g, '');
const toolbarStart = publicTemplate.indexOf('<div id="copy-toolbar"');
const cursorStart = publicTemplate.indexOf('<div id="cursor"');
publicTemplate = publicTemplate.slice(0, toolbarStart) + publicTemplate.slice(cursorStart);
let reader = `const BUNDLED_CURSORS=${encode(cursors)};\nconst BUNDLED_PORTRAITS=${encode(portraits)};\nconst BUNDLED_ARCHIVE=${encode(JSON.parse(read('archive.json')))};\nconst BUNDLED_COPY=${encode(JSON.parse(read('settings.json')))};\n${mediaValidation}\n${read('public.js')}\n${read('audio.js')}\n${read('spine.js')}\n${read('cursor.js')}`;
reader = reader.replaceAll('</script', '<\\/script');
function compile(template, script) {
 const csp = `default-src 'self'; script-src 'self' ${hash(script)}; style-src 'self' ${hash(css)}; img-src 'self' data: https:; media-src 'self'; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`;
 const html = template
  .replace(/<link rel="stylesheet" href="[^"]+">/, `<style>${css}</style>`)
  .replace('href="favicon.svg"', `href="${favicon}"`)
  .replace(/<script src="[^"]+" defer><\/script>/, '')
  .replace('</body>', `<script>${script}</script></body>`);
 const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n`;
 return {html,headers};
}
function outputDirectory(name, bundle) {
 const output = resolve(root, name); rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
 writeFileSync(resolve(output, 'index.html'), bundle.html); writeFileSync(resolve(output, '_headers'), bundle.headers);
 for (const file of ['archive.json','settings.json','.nojekyll','favicon.svg']) copyFileSync(resolve(root,file),resolve(output,file));
 mkdirSync(resolve(output,'assets/fonts'),{recursive:true}); copyFileSync(resolve(root,'assets/fonts/Pretendard-OFL.txt'),resolve(output,'assets/fonts/Pretendard-OFL.txt'));
 copyFileSync(resolve(root,'assets/fonts/Transcity-SOURCE.txt'),resolve(output,'assets/fonts/Transcity-SOURCE.txt'));
 for (const file of ['NotoSerifTC-OFL.txt','Favicon-SOURCE.txt']) copyFileSync(resolve(root,'assets/fonts/'+file),resolve(output,'assets/fonts/'+file));
 cpSync(resolve(root,'assets/audio'),resolve(output,'assets/audio'),{recursive:true});
 cpSync(resolve(root,'assets/cursors'),resolve(output,'assets/cursors'),{recursive:true});
}
const publicBundle = compile(publicTemplate, reader), editorBundle = compile(editorTemplate, app);
writeFileSync(resolve(root,'index.html'),publicBundle.html);writeFileSync(resolve(root,'_headers'),publicBundle.headers);
outputDirectory('dist',publicBundle);outputDirectory('dist-admin',editorBundle);
console.log('Built read-only public site in dist/ and separate editor in dist-admin/. Protect the editor with Cloudflare Access before publishing it.');

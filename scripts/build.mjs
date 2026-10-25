import { cpSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
// HTML parsing normalizes CRLF; CSP hashes must use the same LF source.
const read = file => readFileSync(resolve(root, file), 'utf8').replace(/\r\n?/g, '\n');
// Reassemble large media from bounded source chunks and verify byte integrity.
for(const asset of JSON.parse(read('assets/packed/manifest.json'))){
 const bytes=Buffer.concat(asset.parts.map(part=>readFileSync(resolve(root,part))));
 if(createHash('sha256').update(bytes).digest('hex')!==asset.sha256)throw Error('Media integrity check failed: '+asset.target);
 mkdirSync(resolve(root,asset.target,'..'),{recursive:true});writeFileSync(resolve(root,asset.target),bytes);
}
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
const fontFile = 'assets/fonts/OnulSamhwagothic-Regular.woff2';
const spineFont = 'assets/fonts/Transcity-Regular.otf';
// Versioned assets can be cached without inflating the first HTML response.
const externalAssets = new Map();
function assetUrl(file) {
 const digest = createHash('sha256').update(readFileSync(resolve(root,file))).digest('hex').slice(0,16);
 const target = file.replace(/(\.[^.]+)$/, `.${digest}$1`);
 externalAssets.set(file,target); return target;
}
css = css.replaceAll(fontFile, assetUrl(fontFile)).replaceAll(spineFont, assetUrl(spineFont));
for (const font of ['PretendardVariable','ChillJinshuSongHeavy','OnulGoraesil-ExtraBold']) {
 const file = `assets/fonts/${font}.woff2`;
 css = css.replaceAll(file, assetUrl(file));
}
const cursorData = file => `data:image/svg+xml;base64,${Buffer.from(read(file)).toString('base64')}`;
const cursors = {
  arrow: 'assets/cursors/left_ptr.svg',
  hand: 'assets/cursors/hand2.svg',
  text: 'assets/cursors/xterm.svg',
  wait: Array.from({ length: 40 }, (_, i) => `assets/cursors/wait/wait-${String(i+1).padStart(2,'0')}.svg`),
};
for (const file of ['left_ptr.svg', 'hand2.svg', 'xterm.svg']) {
  css = css.replaceAll(`assets/cursors/${file}`, cursorData(`assets/cursors/${file}`));
}
const publishedLoader = read('shared/loading.mjs').replaceAll('export async function ', 'async function ');
const tapes = [
 {ratio:'530 / 205',width:114},{ratio:'445 / 205',width:104},
 {ratio:'280 / 365',width:46},{ratio:'280 / 365',width:46},
 {ratio:'637 / 205',width:126},
].map((tape,i)=>({...tape,src:assetUrl(`assets/tapes/tape-${i+1}.png`)}));
const galleryLayout = read('shared/gallery.mjs').replaceAll('export function ', 'function ');
const orderLogic = read('shared/order.mjs').replaceAll('export function ', 'function ');
const mediaValidation = read('shared/media.mjs').replaceAll('export function ', 'function ');
let app = (publishedLoader + '\n' + galleryLayout + '\n' + mediaValidation + '\n' + orderLogic + '\n' + read('manager-order.js') + '\n' + read('app.js') + '\n' + read('publish.js') + '\n' + read('audio.js') + '\n' + read('spine.js') + '\n' + read('cursor.js'))
  .replaceAll('img.src=r.image;', 'img.src=BUNDLED_PORTRAITS[r.image]||r.image;')
  .replace("$('#detail-image').src=r.image;", "$('#detail-image').src=BUNDLED_PORTRAITS[r.image]||r.image;")
  .replace('async function loadCopy(){', 'async function loadCopy(){publishedCopy=validateCopy(BUNDLED_COPY);')
  .replace('records=samples;demo=true;render()', "records=validate(BUNDLED_ARCHIVE);demo=records.some(r=>r.id.startsWith('sample-'));render()")
  .replace("Promise.all([loadCopy(),init()]).finally", "siteCopy=validateCopy(BUNDLED_COPY);records=validate(BUNDLED_ARCHIVE);demo=records.some(r=>r.id.startsWith('sample-'));render();Promise.all([loadCopy(),init()]).finally");
app = `const BUNDLED_CURSORS=${encode(cursors)};\nconst BUNDLED_PORTRAITS=${encode(portraits)};\nconst BUNDLED_ARCHIVE=${encode(JSON.parse(read('archive.json')))};\nconst BUNDLED_COPY=${encode(JSON.parse(read('settings.json')))};\n${app}`;
app = `const BUNDLED_TAPES=${encode(tapes)};\n${app}`;
app = app.replaceAll('</script', '<\\/script');
const hash = text => `'sha256-${createHash('sha256').update(text).digest('base64')}'`;
const favicon = `data:image/svg+xml;base64,${Buffer.from(read('favicon.svg')).toString('base64')}`;
const editorTemplate = read('src/index.html');
const publicCopy = {...JSON.parse(read('settings.json')),titleLead:'',titleAccent:'',managerTitle:''};
let publicTemplate = editorTemplate
 .replace(/(<(?:span|em) data-copy="(?:titleLead|titleAccent)">)[^<]*/g,'$1')
 .replace('assets/audio/bgm.mp3',assetUrl('assets/audio/bgm-stream.mp3'))
 .replace('class="copy-loading"', 'class="archive-loading copy-pending"')
 .replace('<div id="archive"></div>', '<p id="archive-loading" role="status">아카이브를 불러오는 중…</p><div id="archive"></div>')
 .replace(/<div class="header-actions">[\s\S]*?<\/div>/, '')
 .replace(/<button id="edit-selected"[\s\S]*?<\/button>/, '')
 .replace(/<dialog id="(?:manager|editor|publish-dialog)"[\s\S]*?<\/dialog>/g, '');
const toolbarStart = publicTemplate.indexOf('<div id="copy-toolbar"');
const cursorStart = publicTemplate.indexOf('<div id="cursor"');
publicTemplate = publicTemplate.slice(0, toolbarStart) + publicTemplate.slice(cursorStart);
let reader = `const BUNDLED_CURSORS=${encode(cursors)};\nconst BUNDLED_PORTRAITS={};\nconst BUNDLED_ARCHIVE=[];\nconst BUNDLED_COPY=${encode(publicCopy)};\n${publishedLoader}\n${galleryLayout}\n${mediaValidation}\n${read('public.js')}\n${read('showcase.js')}\n${read('audio.js')}\n${read('spine.js')}\n${read('cursor.js')}`;
reader = `const PUBLIC_FONT_URL=${encode(externalAssets.get(fontFile))};\n${read('shared/mobile-font.mjs').replaceAll('export function ','function ')}\n${read('shared/scroll-images.mjs').replaceAll('export function ','function ')}\nconst BUNDLED_TAPES=${encode(tapes)};\n${reader}`;
reader = reader.replaceAll('</script', '<\\/script');
function compile(template, script, compiledCss=css) {
 const csp = `default-src 'self'; script-src 'self' ${hash(script)}; style-src 'self' ${hash(compiledCss)}; img-src 'self' data: https:; media-src 'self'; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`;
 const html = template
  .replace(/<link rel="stylesheet" href="[^"]+">/, `<style>${compiledCss}</style>`)
  .replace('href="favicon.svg"', `href="${favicon}"`)
  .replace(/<script src="[^"]+" defer><\/script>/, '')
  .replace('</body>', `<script>${script}</script></body>`);
 const headers = `/*\n  Content-Security-Policy: ${csp}\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n/assets/published/*\n  Cache-Control: public, max-age=31536000, immutable\n` + [...externalAssets.values()].map(file=>`/${file}\n  Cache-Control: public, max-age=31536000, immutable\n`).join('');
 return {html,headers};
}
function outputDirectory(name, bundle) {
 const output = resolve(root, name); rmSync(output, { recursive: true, force: true }); mkdirSync(output, { recursive: true });
 writeFileSync(resolve(output, 'index.html'), bundle.html); writeFileSync(resolve(output, '_headers'), bundle.headers);
 for (const file of ['archive.json','settings.json','.nojekyll','favicon.svg']) copyFileSync(resolve(root,file),resolve(output,file));
 if(name==='dist'){writeFileSync(resolve(output,'archive.json'),'[]');writeFileSync(resolve(output,'settings.json'),encode(publicCopy));}
 mkdirSync(resolve(output,'assets/fonts'),{recursive:true}); copyFileSync(resolve(root,'assets/fonts/Pretendard-OFL.txt'),resolve(output,'assets/fonts/Pretendard-OFL.txt'));
 for(const [source,target] of externalAssets){mkdirSync(resolve(output,target,'..'),{recursive:true});copyFileSync(resolve(root,source),resolve(output,target));}
 copyFileSync(resolve(root,'assets/fonts/Transcity-SOURCE.txt'),resolve(output,'assets/fonts/Transcity-SOURCE.txt'));
 for (const file of ['NotoSerifTC-OFL.txt','NotoSerifKR-OFL.txt','TitleFont-SOURCE.txt','Favicon-SOURCE.txt','ArchiveFonts-SOURCE.txt']) copyFileSync(resolve(root,'assets/fonts/'+file),resolve(output,'assets/fonts/'+file));
 cpSync(resolve(root,'assets/audio'),resolve(output,'assets/audio'),{recursive:true});
 cpSync(resolve(root,'assets/cursors'),resolve(output,'assets/cursors'),{recursive:true});
 cpSync(resolve(root,'assets/published'),resolve(output,'assets/published'),{recursive:true});
}
const publicCss=css.replace(/@font-face\{font-family:'OnulSamhwagothic-Regular'[^}]*\}/g,face=>`@media not all and (pointer:coarse){${face}}`);
const publicBundle = compile(publicTemplate, reader,publicCss), editorBundle = compile(editorTemplate, app);
writeFileSync(resolve(root,'index.html'),publicBundle.html);writeFileSync(resolve(root,'_headers'),publicBundle.headers);
outputDirectory('dist',publicBundle);outputDirectory('dist-admin',editorBundle);
console.log('Built read-only public site in dist/ and separate editor in dist-admin/. Protect the editor with Cloudflare Access before publishing it.');

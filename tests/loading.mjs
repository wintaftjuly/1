import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {Script} from 'node:vm';
const root=resolve(import.meta.dirname,'..');
for(const directory of ['dist','dist-admin']){
 const html=readFileSync(resolve(root,directory,'index.html'),'utf8');
 assert(Buffer.byteLength(html)<400000,'Initial HTML must stay below 400 KB');
 const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];new Script(script);
 const css=html.match(/<style>([\s\S]*?)<\/style>/)[1];
 const headers=readFileSync(resolve(root,directory,'_headers'),'utf8');
 for(const block of [script,css]) assert(headers.includes(createHash('sha256').update(block).digest('base64')),'CSP hash must match output');
 const assets=[...new Set(html.match(/assets\/(?:fonts|tapes)\/[^'"\s)]+\.(?:woff2|otf|png)/g))];
 assert.equal(assets.length,7);
 for(const file of assets){assert(existsSync(resolve(root,directory,file)),`Missing ${file}`);assert(headers.includes('/'+file+'\n  Cache-Control: public, max-age=31536000, immutable'));}
 assert(!html.includes('data:font/'),'Fonts must not block HTML download');
 if(directory==='dist'){assert(html.includes('class="archive-loading"'));assert(!html.includes('class="copy-loading"'));assert(html.includes('role="status"'));}
}
console.log('PASS: initial HTML budget, emitted assets, cache headers, CSP hashes, executable scripts, visible public loading shell');

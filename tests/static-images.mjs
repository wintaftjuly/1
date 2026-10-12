import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {STATIC_IMAGES,STATIC_IMAGE_DETAILS,STATIC_IMAGE_THUMBNAILS} from '../shared/static-images.mjs';
import worker from '../worker/index.mjs';
for(const file of [...Object.values(STATIC_IMAGES),...Object.values(STATIC_IMAGE_DETAILS),...Object.values(STATIC_IMAGE_THUMBNAILS)]){
 const bytes=readFileSync(new URL('../'+file,import.meta.url));
 assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
 assert(file.includes(createHash('sha256').update(bytes).digest('hex').slice(0,16)));
}
assert.equal(Object.keys(STATIC_IMAGE_THUMBNAILS).length,21);
let fullBytes=0,mobileBytes=0;
for(const [full,mobile] of Object.entries(STATIC_IMAGE_THUMBNAILS)){fullBytes+=statSync(new URL('../'+full,import.meta.url)).size;mobileBytes+=statSync(new URL('../'+mobile,import.meta.url)).size;}
assert(mobileBytes<fullBytes*.4,'Mobile cards should transfer less than 40% of full image bytes');
const preview=STATIC_IMAGES['https://i.imgur.com/wglOzPT.gif'];assert(statSync(new URL('../'+preview,import.meta.url)).size<600000);assert(STATIC_IMAGE_DETAILS[preview]);
let requested;
const path=Object.keys(STATIC_IMAGES).find(key=>key.startsWith('/published-images/'));
const env={ADMIN_MODE:'false',ARCHIVE_STORE:{get:async()=>{throw Error('Bundled photos must not read KV');}},ASSETS:{fetch:async request=>{requested=new URL(request.url).pathname;return new Response('webp',{headers:{'Content-Type':'image/webp'}});}}};
const response=await worker.fetch(new Request('https://public.example'+path),env);
assert.equal(response.status,200);assert.equal(requested,'/'+STATIC_IMAGES[path]);
const config=JSON.parse(readFileSync(new URL('../wrangler.jsonc',import.meta.url)));
assert(Array.isArray(config.assets.run_worker_first));assert(!config.assets.run_worker_first.includes('/assets/published/*'),'Static photos must bypass Worker execution');
console.log('PASS all optimized assets exist and match hashes; animation preview below 600KB; current photos bypass KV and static assets bypass Worker');

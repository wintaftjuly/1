import { isAllowedImage } from '../shared/media.mjs';
import { STATIC_IMAGES, STATIC_IMAGE_DETAILS } from '../shared/static-images.mjs';
const STATE_KEY = 'published-v1';
const PUBLIC_KEY = 'published-public-v2';
const MAX_BYTES = 24 * 1024 * 1024;
const COPY_KEYS = ['titleLead','titleAccent','subtitle','spine','characterLabel','seasonLabel','viewStory','managerTitle','footerHandle'];
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
let certCache;
const publicReadCache=new WeakMap();
function readPublicState(store,key=STATE_KEY){
 if(!store)return Promise.resolve(null);
 let entries=publicReadCache.get(store);if(!entries){entries=new Map();publicReadCache.set(store,entries);}
 const existing=entries.get(key);if(existing&&existing.until>Date.now())return existing.promise;
 if(entries.size>=2)entries.clear();
 const promise=store.get(key,'json').catch(error=>{entries.delete(key);throw error;});
 entries.set(key,{until:Date.now()+15000,promise});return promise;
}
function publicState(state,origin){
 const archive=typeof state.version==='string'&&/^[a-zA-Z0-9-]{1,100}$/.test(state.version)
  ?state.archive.map((row,index)=>({...row,image:row.image.startsWith('data:image/')?origin+'/published-images/'+state.version+'/'+index:row.image.startsWith('/published-images/')?origin+row.image:row.image})):state.archive;
 return{archive:archive.map(row=>{const url=new URL(row.image,origin);const key=url.origin===origin?url.pathname:row.image;const file=STATIC_IMAGES[key];return file?{...row,image:origin+'/'+file,...(STATIC_IMAGE_DETAILS[file]?{detailImage:origin+'/'+STATIC_IMAGE_DETAILS[file]}:{})}:row;}),settings:state.settings};
}
export async function writePublicFiles(store,state){
 const archive=[];
 // Immutable versioned files are written before the public manifest switches.
 for(let index=0;index<state.archive.length;index++){
  const row=state.archive[index],response=imageResponse(row.image);
  if(response){await store.put('published-file:'+state.version+':'+index,await response.arrayBuffer(),{metadata:{contentType:response.headers.get('Content-Type')}});}
  archive.push({...row,image:response?'/published-images/'+state.version+'/'+index:row.image});
 }
 return {archive,settings:state.settings,version:state.version,publishedAt:state.publishedAt};
}
function imageResponse(image){
 const data=typeof image==='string'?image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/):null;
 if(!data)return null;
 const binary=atob(data[2]),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Response(bytes,{headers:{'Content-Type':data[1],'Cache-Control':'public, max-age=604800, immutable','X-Content-Type-Options':'nosniff','X-Archive-Cache':'MISS'}});
}
async function readPublicMetadata(env,origin,ctx){
 const cache=typeof caches!=='undefined'?caches.default:null;
 const key=new Request(origin+'/__archive_metadata_v3');
 const hit=cache?await cache.match(key).catch(()=>null):null;
 if(hit)return hit.json();
 const compact=await readPublicState(env.ARCHIVE_STORE,PUBLIC_KEY);
 const state=compact||await readPublicState(env.ARCHIVE_STORE);
 if(!state)return null;
 const metadata=publicState(state,origin);
 if(cache&&ctx?.waitUntil){
  // Only this compact response is cached briefly; photo URLs remain immutable.
  ctx.waitUntil(cache.put(key,new Response(JSON.stringify(metadata),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=30'}})).catch(()=>{}));
  const first=state.archive.map((row,index)=>({row,index})).sort((a,b)=>b.row.year-a.row.year).slice(0,4);
  ctx.waitUntil(Promise.all(first.map(async({row,index})=>{
   const url=metadata.archive[index].image;if(!url.startsWith(origin+'/published-images/'))return;
   const request=new Request(url);if(await cache.match(request))return;
   const response=imageResponse(row.image);if(response)await cache.put(request,response);
  })).catch(()=>{}));
 }
 return metadata;
}
function decode(value) { return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')), c => c.charCodeAt(0)); }
export async function authenticate(request, env) {
 const team = env.ACCESS_TEAM_DOMAIN, audience = env.ACCESS_AUD;
 if (!team || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !audience) return false;
 try {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token || token.length > 16000) return false;
  const [head,body,signature,...extra] = token.split('.'); if (extra.length || !signature) return false;
  const header = JSON.parse(new TextDecoder().decode(decode(head)));
  const claims = JSON.parse(new TextDecoder().decode(decode(body)));
  const now = Math.floor(Date.now()/1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' || claims.iss !== 'https://'+team || !Array.isArray(claims.aud) || !claims.aud.includes(audience) || !Number.isFinite(claims.exp) || claims.exp <= now || !Number.isFinite(claims.iat) || claims.iat > now+60 || (claims.nbf !== undefined && claims.nbf > now+60) || typeof claims.email !== 'string') return false;
  if (!certCache || certCache.team !== team || certCache.until < Date.now() || !certCache.keys.some(k=>k.kid===header.kid)) {
   const response = await fetch('https://'+team+'/cdn-cgi/access/certs'); if (!response.ok) return false;
   const result = await response.json(); certCache = {team,keys:result.keys,until:Date.now()+300000};
  }
  const jwk = certCache.keys.find(key=>key.kid===header.kid && key.kty==='RSA'); if (!jwk) return false;
  const key = await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(signature),new TextEncoder().encode(head+'.'+body));
 } catch { return false; }
}
export function validateState(data) {
 if (!data || !Array.isArray(data.archive) || data.archive.length > 300 || !data.settings || typeof data.settings !== 'object' || Array.isArray(data.settings)) throw Error('잘못된 게시 자료입니다.');
 const ids = new Set();
 const archive = data.archive.map(row => {
  if (!row || typeof row.id !== 'string' || !row.id || row.id.length > 100 || ids.has(row.id) || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80 || typeof row.community !== 'string' || !row.community.trim() || row.community.length > 120 || !Number.isInteger(row.year) || row.year < 1900 || row.year > 2100 || typeof row.note !== 'string' || row.note.length > 2000 || typeof row.image !== 'string' || row.image.length > 2500000 || !isAllowedImage(row.image) || (row.altName !== undefined && (typeof row.altName !== 'string' || row.altName.length > 120))) throw Error('캐릭터 자료 또는 이미지 형식이 올바르지 않습니다.');
  ids.add(row.id); return {id:row.id,name:row.name.trim(),community:row.community.trim(),year:row.year,note:row.note,image:row.image,altName:(row.altName||'').trim()};
 });
 const settings = {};
 for (const key of COPY_KEYS) { const value = data.settings[key]; if (typeof value !== 'string' || value.length > 600) throw Error('문구 형식이 올바르지 않습니다.'); settings[key] = value; }
 return {archive,settings};
}
export default {
 async fetch(request,env,ctx) {
  const url = new URL(request.url), admin = env.ADMIN_MODE === 'true';
  if (admin) {
   if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return json({error:'관리자 인증 설정이 필요합니다. ACCESS_TEAM_DOMAIN과 ACCESS_AUD를 설정하세요.'},503);
   if (!await authenticate(request,env)) return json({error:'본인 로그인이 필요합니다.'},401);
  }
  if (url.pathname === '/api/publish') {
   if (!admin) return json({error:'공개 사이트에서는 게시할 수 없습니다.'},403);
   if (request.method !== 'POST') return json({error:'POST required'},405);
   if (request.headers.get('Origin') !== url.origin || !request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'올바르지 않은 요청입니다.'},403);
   if (!env.ARCHIVE_STORE) return json({error:'Cloudflare KV 저장소를 연결하세요.'},503);
   if (Number(request.headers.get('Content-Length')) > MAX_BYTES) return json({error:'자료가 너무 큽니다. 전체 사진과 자료는 24MB 이하여야 합니다.'},413);
   try {
    // Stream with a cap so a missing or incorrect Content-Length cannot bypass it.
    const reader = request.body?.getReader(); if (!reader) return json({error:'자료가 없습니다.'},400);
    const chunks=[];let length=0;
    while (true) {const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>MAX_BYTES){await reader.cancel();return json({error:'전체 사진과 자료는 24MB 이하여야 합니다.'},413)}chunks.push(value)}
    const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length}
    const state=validateState(JSON.parse(new TextDecoder().decode(bytes)));
    state.publishedAt=new Date().toISOString();state.version=crypto.randomUUID();
    const previous=await env.ARCHIVE_STORE.get(STATE_KEY,'json');
    if(previous?.version) await env.ARCHIVE_STORE.put('published-snapshot:'+previous.version,JSON.stringify(previous),{expirationTtl:604800});
    const compact=await writePublicFiles(env.ARCHIVE_STORE,state);
    await env.ARCHIVE_STORE.put(STATE_KEY,JSON.stringify(state));
    await env.ARCHIVE_STORE.put(PUBLIC_KEY,JSON.stringify(compact));
    publicReadCache.delete(env.ARCHIVE_STORE);
    return json({ok:true,publishedAt:state.publishedAt,version:state.version});
   } catch (error) {return json({error:error instanceof SyntaxError?'자료 형식이 올바르지 않습니다.':error.message || '게시하지 못했습니다.'},400)}
  }
  if (url.pathname === '/api/state' && !admin) return json({error:'Not found'},404);
  // Keep embedded photos out of the public list so metadata can render first.
  if (url.pathname.startsWith('/published-images/')) {
   if (!['GET','HEAD'].includes(request.method)) return json({error:'Method not allowed'},405);
   const match=url.pathname.match(/^\/published-images\/([a-zA-Z0-9-]{1,100})\/(0|[1-9]\d*)$/);
   if (!match) return json({error:'Not found'},404);
   try {
    if(STATIC_IMAGES[url.pathname])return env.ASSETS.fetch(new Request(url.origin+'/'+STATIC_IMAGES[url.pathname],request));
    const cache=!admin&&typeof caches!=='undefined'?caches.default:null;
    const cacheUrl=new URL(url);cacheUrl.search='';const cacheKey=new Request(cacheUrl,{method:'GET'});
    const hit=cache?await cache.match(cacheKey).catch(()=>null):null;
    if(hit){const headers=new Headers(hit.headers);headers.set('X-Archive-Cache','HIT');return new Response(request.method==='HEAD'?null:hit.body,{status:hit.status,headers});}
    if(env.ARCHIVE_STORE?.getWithMetadata){
     const file=await env.ARCHIVE_STORE.getWithMetadata('published-file:'+match[1]+':'+match[2],request.method==='HEAD'?'stream':'arrayBuffer');
     if(file.value){
      if(request.method==='HEAD')file.value.cancel?.().catch(()=>{});
      const response=new Response(request.method==='HEAD'?null:file.value,{headers:{'Content-Type':file.metadata?.contentType||'application/octet-stream','Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','X-Archive-Storage':'file','X-Archive-Cache':cache?'MISS':'BYPASS'}});
      if(cache&&request.method==='GET'){const pending=cache.put(cacheKey,response.clone()).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(pending);else await pending;}
      return response;
     }
    }
    let state=await readPublicState(env.ARCHIVE_STORE);
    if(state && state.version!==match[1]) state=await readPublicState(env.ARCHIVE_STORE,'published-snapshot:'+match[1]);
    const image=state?.version===match[1]?state.archive?.[Number(match[2])]?.image:null;
    const data=typeof image==='string'?image.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/):null;
    if (!data) return json({error:'Not found'},404);
    let bytes=null;
    if(request.method!=='HEAD'){const binary=atob(data[2]);bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);}
    const response=new Response(bytes,{headers:{'Content-Type':data[1],'Cache-Control':'public, max-age=604800, immutable','X-Content-Type-Options':'nosniff','X-Archive-Cache':cache?'MISS':'BYPASS'}});
    if(cache&&request.method==='GET'){const pending=cache.put(cacheKey,response.clone()).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(pending);else await pending;}
    return response;
   } catch {return json({error:'이미지를 읽지 못했습니다.'},503)}
  }
  if (['/archive.json','/settings.json','/public-state.json','/api/state'].includes(url.pathname)) {
   if (!['GET','HEAD'].includes(request.method)) return json({error:'Method not allowed'},405);
   try {
    const state = admin?(env.ARCHIVE_STORE?await env.ARCHIVE_STORE.get(STATE_KEY,'json'):null):await readPublicMetadata(env,url.origin,ctx);
    if (url.pathname === '/api/state') return json({configured:!!env.ARCHIVE_STORE,state});
    if (state) {
     const archive=!admin?publicState(state,url.origin).archive:state.archive;
     if(url.pathname==='/public-state.json') return json({archive,settings:state.settings});
     return json(url.pathname === '/archive.json'?archive:state.settings);
    }
    if(!admin||url.pathname==='/public-state.json')return json({error:'게시된 자료가 없습니다.'},503);
   } catch {return json({error:'공개 자료를 읽지 못했습니다.'},503)}
  }
  if (url.pathname.startsWith('/api/')) return json({error:'Not found'},404);
  if(!admin&&['/','/index.html'].includes(url.pathname)&&request.method==='GET'&&env.ARCHIVE_STORE){
   try{
    const state=await readPublicMetadata(env,url.origin,ctx);
    if(state){
     const response=await env.ASSETS.fetch(request);
     if(response.ok&&response.headers.get('Content-Type')?.includes('text/html')){
      const encoded=JSON.stringify(publicState(state,url.origin)).replaceAll('<','\\u003c').replaceAll('\u2028','\\u2028').replaceAll('\u2029','\\u2029');
      const html=new HTMLRewriter().on('head',{element(head){head.append('<script type="application/json" id="published-state">'+encoded+'</script>',{html:true});}}).transform(response);
      const headers=new Headers(html.headers);headers.set('Cache-Control','no-store');
      return new Response(html.body,{status:html.status,headers});
     }
     return response;
    }
   }catch{/* The client can retry the metadata endpoint if storage is unavailable. */}
  }
  if(url.pathname.startsWith('/assets/audio/')&&request.method==='GET'&&request.headers.has('Range')){
   const headers=new Headers(request.headers);headers.delete('Range');
   const response=await env.ASSETS.fetch(new Request(request,{headers}));
   if(response.status!==200)return response;
   const bytes=await response.arrayBuffer(),length=bytes.byteLength;
   const range=request.headers.get('Range').match(/^bytes=(\d*)-(\d*)$/);
   if(!range||(!range[1]&&!range[2]))return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
   const start=range[1]?Number(range[1]):Math.max(0,length-Number(range[2]));
   const end=range[1]?(range[2]?Math.min(Number(range[2]),length-1):length-1):length-1;
   if(start>=length||end<start)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${length}`}});
   const resultHeaders=new Headers(response.headers);resultHeaders.set('Accept-Ranges','bytes');resultHeaders.set('Content-Range',`bytes ${start}-${end}/${length}`);resultHeaders.set('Content-Length',String(end-start+1));
   return new Response(bytes.slice(start,end+1),{status:206,headers:resultHeaders});
  }
  return env.ASSETS.fetch(request);
 }
};

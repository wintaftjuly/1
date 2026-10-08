import { isAllowedImage } from '../shared/media.mjs';
const STATE_KEY = 'published-v1';
const MAX_BYTES = 24 * 1024 * 1024;
const COPY_KEYS = ['titleLead','titleAccent','subtitle','spine','characterLabel','seasonLabel','viewStory','managerTitle','footerHandle'];
const json = (body, status=200) => new Response(JSON.stringify(body), {status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
let certCache;
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
 async fetch(request,env) {
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
    await env.ARCHIVE_STORE.put(STATE_KEY,JSON.stringify(state));
    return json({ok:true,publishedAt:state.publishedAt,version:state.version});
   } catch (error) {return json({error:error instanceof SyntaxError?'자료 형식이 올바르지 않습니다.':error.message || '게시하지 못했습니다.'},400)}
  }
  if (url.pathname === '/api/state' && !admin) return json({error:'Not found'},404);
  if (['/archive.json','/settings.json','/api/state'].includes(url.pathname)) {
   if (!['GET','HEAD'].includes(request.method)) return json({error:'Method not allowed'},405);
   try {
    const state = env.ARCHIVE_STORE ? await env.ARCHIVE_STORE.get(STATE_KEY,'json') : null;
    if (url.pathname === '/api/state') return json({configured:!!env.ARCHIVE_STORE,state});
    if (state) return json(url.pathname === '/archive.json'?state.archive:state.settings);
   } catch {return json({error:'공개 자료를 읽지 못했습니다.'},503)}
  }
  if (url.pathname.startsWith('/api/')) return json({error:'Not found'},404);
  return env.ASSETS.fetch(request);
 }
};

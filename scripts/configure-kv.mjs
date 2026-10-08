import {readFileSync,writeFileSync} from 'node:fs';
const id=process.argv[2];
if(!/^[a-f0-9]{32}$/i.test(id||''))throw Error('Cloudflare KV Namespace ID (32 hex characters) is required.');
for(const name of ['wrangler.jsonc','wrangler.admin.jsonc']){
 const path=new URL('../'+name,import.meta.url),config=JSON.parse(readFileSync(path,'utf8'));
 config.kv_namespaces=[{binding:'ARCHIVE_STORE',id}];writeFileSync(path,JSON.stringify(config,null,2)+'\n');
}
console.log('Both Workers now use the same ARCHIVE_STORE namespace.');

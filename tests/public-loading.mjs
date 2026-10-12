import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {isAllowedImage} from '../shared/media.mjs';
const source=readFileSync(new URL('../public.js',import.meta.url),'utf8');
const archive=JSON.parse(readFileSync(new URL('../archive.json',import.meta.url)));
const copy=JSON.parse(readFileSync(new URL('../settings.json',import.meta.url)));
function setup(){
 let resolveRequest,rejectRequest;const request=new Promise((resolve,reject)=>{resolveRequest=resolve;rejectRequest=reject;});
 const classes=new Set(['archive-loading','copy-pending']);
 const status={children:[],replaceChildren(...nodes){this.children=nodes;},append(node){this.children.push(node);}};
 const node={addEventListener(){},close(){}};
 const context=vm.createContext({BUNDLED_COPY:copy,isAllowedImage,fetchPublished:()=>request,document:{querySelector:s=>s==='#archive-loading'?status:node,documentElement:{classList:{remove:(...names)=>names.forEach(n=>classes.delete(n))}},createTextNode:text=>({text}),createElement:()=>({})}});
 vm.runInContext(source,context);vm.runInContext('render=()=>{}',context);
 return{context,classes,status,resolveRequest,rejectRequest};
}
const success=setup();
assert(success.classes.has('copy-pending'),'Do not expose the obsolete bundled title before loading');
success.resolveRequest(Response.json({archive,settings:{...copy,titleLead:'是',titleAccent:'.否'}}));
await vm.runInContext('refreshInFlight',success.context);
assert.equal(vm.runInContext('siteCopy.titleLead',success.context),'是');
assert(!success.classes.has('copy-pending'));assert(!success.classes.has('archive-loading'));
const failure=setup();failure.rejectRequest(Error('timeout'));await vm.runInContext('refreshInFlight',failure.context);
assert(failure.classes.has('copy-pending'),'A failed request must not reveal the obsolete title');
assert.equal(vm.runInContext('records.length',failure.context),0,'Do not replace published records with sample data');
assert.equal(failure.status.children[1].textContent,'다시 시도');
console.log('PASS: atomic published title/data load; timeout preserves pending title and offers retry without samples');

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../shared/mobile-font.mjs',import.meta.url),'utf8').replace('export function ','function ');
function setup(coarse,complete=false){
 const images=Array.from({length:2},()=>({complete,listeners:{},addEventListener(event,callback){this.listeners[event]=callback;}}));
 let loads=0,added=0;const timers=[];
 const context={PUBLIC_FONT_URL:'assets/font.woff2',matchMedia:()=>({matches:coarse}),document:{querySelectorAll:()=>images,fonts:{add:()=>added++}},FontFace:class{constructor(name,url){assert.equal(name,'Pretendard');assert(url.includes('assets/font.woff2'));}load(){loads++;return Promise.resolve(this);}},setTimeout:callback=>{timers.push(callback);return timers.length;},clearTimeout(){},requestIdleCallback:callback=>callback()};
 runInNewContext(source+';schedulePublicFont();schedulePublicFont();',context);
 return {images,timers,get loads(){return loads},get added(){return added}};
}
const mobile=setup(true);assert.equal(mobile.loads,0);mobile.images[0].listeners.load();assert.equal(mobile.loads,0);mobile.images[1].listeners.load();assert.equal(mobile.loads,1);await Promise.resolve();assert.equal(mobile.added,1);mobile.timers[0]();assert.equal(mobile.loads,1);
assert.equal(setup(false).loads,0);assert.equal(setup(true,true).loads,1);
const broken=setup(true);broken.images.forEach(image=>image.listeners.error());assert.equal(broken.loads,1);
const slow=setup(true);slow.timers[0]();assert.equal(slow.loads,1);
console.log('PASS mobile font waits for first portraits, desktop unaffected, cached/failed/slow images cannot block font forever');

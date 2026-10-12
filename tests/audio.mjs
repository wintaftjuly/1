import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../audio.js',import.meta.url),'utf8');
function setup(){
 const buttons={},events={},timers=[];let plays=0,loads=0;
 for(const key of ['bgm-play','bgm-pause','bgm-stop','bgm-time'])buttons['#'+key]={setAttribute(){}};
 const audio={dataset:{deferBoot:'true'},paused:true,currentTime:0,duration:126,error:null,addEventListener(){},load(){loads++;this.error=null},async play(){plays++;this.paused=false},pause(){this.paused=true}};
 runInNewContext(source,{document:{querySelector:s=>s==='#bgm'?audio:buttons[s],addEventListener:(event,callback)=>events[event]=callback},window:{addEventListener(){throw Error('Do not wait for window.load');}},setTimeout:callback=>timers.push(callback)});
 return{audio,buttons,timers,events,get plays(){return plays},get loads(){return loads}};
}
const normal=setup();assert.equal(normal.plays,0);normal.timers[0]();await Promise.resolve();assert.equal(normal.plays,1);assert.equal(normal.audio.paused,false);
const stopped=setup();stopped.buttons['#bgm-stop'].onclick();stopped.timers[0]();assert.equal(stopped.plays,0);
const paused=setup();paused.buttons['#bgm-pause'].onclick();paused.timers[0]();assert.equal(paused.plays,0);
normal.audio.error={code:2};await normal.buttons['#bgm-play'].onclick();assert.equal(normal.loads,1);assert.equal(normal.plays,2);
console.log('PASS music starts without waiting for images; stop/pause prevent autostart; failed source reloads on retry');

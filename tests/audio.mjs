import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync(new URL('../audio.js',import.meta.url),'utf8');
function setup(){
 const buttons={},events={};let plays=0,loads=0,denied=false;
 for(const key of ['bgm-play','bgm-pause','bgm-stop','bgm-time'])buttons['#'+key]={attributes:{},setAttribute(key,value){this.attributes[key]=value;}};
 const audio={paused:true,currentTime:0,duration:126,error:null,addEventListener:(event,callback)=>events[event]=callback,load(){loads++;this.error=null},async play(){plays++;if(denied)throw Object.assign(Error(),{name:'NotAllowedError'});this.paused=false},pause(){this.paused=true}};
 runInNewContext(source,{document:{querySelector:s=>s==='#bgm'?audio:buttons[s],addEventListener(){throw Error('Only the play button may start music');}},setTimeout(){throw Error('No delayed autostart');}});
 return{audio,buttons,events,deny(){denied=true},get plays(){return plays},get loads(){return loads}};
}
const normal=setup();assert.equal(normal.plays,0);assert.equal(normal.audio.paused,true);assert.equal(normal.buttons['#bgm-play'].attributes['aria-pressed'],'false');
await normal.buttons['#bgm-play'].onclick();assert.equal(normal.plays,1);assert.equal(normal.audio.paused,false);
normal.audio.currentTime=42;normal.buttons['#bgm-pause'].onclick();assert.equal(normal.audio.paused,true);assert.equal(normal.audio.currentTime,42);assert.equal(normal.plays,1);
await normal.buttons['#bgm-play'].onclick();assert.equal(normal.audio.currentTime,42);assert.equal(normal.plays,2);
normal.buttons['#bgm-stop'].onclick();assert.equal(normal.audio.paused,true);assert.equal(normal.audio.currentTime,0);assert.equal(normal.plays,2);
normal.audio.error={code:2};normal.events.error();assert.equal(normal.plays,2);await normal.buttons['#bgm-play'].onclick();assert.equal(normal.loads,1);assert.equal(normal.plays,3);
const blocked=setup();blocked.deny();await blocked.buttons['#bgm-play'].onclick();assert.equal(blocked.plays,1);assert.equal(blocked.audio.paused,true);assert.equal(blocked.buttons['#bgm-play'].attributes['aria-pressed'],'false');
console.log('PASS music starts only on play; pause resumes position, stop resets, errors require another play click');

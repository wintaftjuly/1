// Shared by the public page and the protected editor.
const bgm=document.querySelector('#bgm'),bgmPlay=document.querySelector('#bgm-play'),bgmPause=document.querySelector('#bgm-pause'),bgmStop=document.querySelector('#bgm-stop'),bgmTime=document.querySelector('#bgm-time');
let bgmStopped=true;
function musicTime(value){if(!Number.isFinite(value))return '--:--';const seconds=Math.max(0,Math.floor(value));return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function updateMusic(){bgmTime.textContent=musicTime(bgm.currentTime)+' / '+musicTime(bgm.duration);bgmPlay.setAttribute('aria-pressed',String(!bgm.paused));bgmPause.setAttribute('aria-pressed',String(bgm.paused&&!bgmStopped));bgmStop.setAttribute('aria-pressed',String(bgmStopped))}
async function playMusic(){bgmStopped=false;try{if(bgm.error)bgm.load();await bgm.play();bgmPlay.title='재생 중'}catch(error){bgmPlay.title=error.name==='NotAllowedError'?'음악을 재생하려면 눌러 주세요':'다시 눌러 음악 불러오기'}updateMusic()}
bgmPlay.onclick=playMusic;
bgmPause.onclick=()=>{bgmStopped=false;bgm.pause();updateMusic()};
bgmStop.onclick=()=>{bgmStopped=true;bgm.pause();bgm.currentTime=0;updateMusic()};
for(const event of ['loadedmetadata','durationchange','timeupdate','play','pause','ended'])bgm.addEventListener(event,updateMusic);
bgm.addEventListener('error',()=>{bgmTime.textContent='음악 다시 시도 ↗';bgmPlay.title='다시 눌러 음악 불러오기'});
updateMusic();

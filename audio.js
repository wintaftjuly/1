// Shared by the public page and the protected editor.
const bgm=document.querySelector('#bgm'),bgmPlay=document.querySelector('#bgm-play'),bgmPause=document.querySelector('#bgm-pause'),bgmStop=document.querySelector('#bgm-stop'),bgmTime=document.querySelector('#bgm-time');
let bgmStopped=false,awaitingMusicGesture=false,musicAutostartPending=true;
function musicTime(value){if(!Number.isFinite(value))return '--:--';const seconds=Math.max(0,Math.floor(value));return String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')}
function updateMusic(){bgmTime.textContent=musicTime(bgm.currentTime)+' / '+musicTime(bgm.duration);bgmPlay.setAttribute('aria-pressed',String(!bgm.paused));bgmPause.setAttribute('aria-pressed',String(bgm.paused&&!bgmStopped));bgmStop.setAttribute('aria-pressed',String(bgmStopped))}
async function playMusic(){musicAutostartPending=false;bgmStopped=false;awaitingMusicGesture=false;try{if(bgm.error)bgm.load();await bgm.play();bgmPlay.title='재생 중'}catch(error){awaitingMusicGesture=error.name==='NotAllowedError';bgmPlay.title=awaitingMusicGesture?'음악을 재생하려면 눌러 주세요':'다시 눌러 음악 불러오기'}updateMusic()}
bgmPlay.onclick=playMusic;
bgmPause.onclick=()=>{musicAutostartPending=false;awaitingMusicGesture=false;bgmStopped=false;bgm.pause();updateMusic()};
bgmStop.onclick=()=>{musicAutostartPending=false;awaitingMusicGesture=false;bgmStopped=true;bgm.pause();bgm.currentTime=0;updateMusic()};
for(const event of ['loadedmetadata','durationchange','timeupdate','play','pause','ended'])bgm.addEventListener(event,updateMusic);
bgm.addEventListener('error',()=>{awaitingMusicGesture=true;bgmTime.textContent='음악 다시 시도 ↗';bgmPlay.title='다시 눌러 음악 불러오기'});
function unlockMusic(event){if(awaitingMusicGesture&&!event.target.closest('.bgm-player'))playMusic()}
document.addEventListener('pointerdown',unlockMusic);document.addEventListener('keydown',unlockMusic);
updateMusic();
// Media playback must not wait for every image (including offscreen animations).
if(bgm.dataset.deferBoot==='true'){awaitingMusicGesture=true;setTimeout(()=>{if(musicAutostartPending)playMusic();},0);}else playMusic();

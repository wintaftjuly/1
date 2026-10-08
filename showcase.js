// Local recording only. The normal public page has no recording controls.
(()=>{
 if(new URLSearchParams(location.search).get('showcase')!=='1')return;
 const panel=document.createElement('section');panel.className='showcase-panel';panel.setAttribute('aria-label','포트폴리오 촬영');
 const heading=document.createElement('strong');heading.textContent='포트폴리오 촬영';
 const info=document.createElement('p');info.textContent='Chrome 또는 Edge에서 시작을 누르고 화면 공유 창의 현재 탭을 선택해 주세요. 자동 스크롤 후 영상 파일을 저장합니다.';
 const start=document.createElement('button');start.type='button';start.textContent='자동 녹화 시작';
 const status=document.createElement('p');status.setAttribute('role','status');
 const download=document.createElement('a');download.className='button';download.hidden=true;download.textContent='녹화 파일 저장';
 panel.append(heading,info,start,status,download);document.body.append(panel);
 let stream,recorder,active=false,savedUrl;
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 async function moveTo(top,ms=1400){
  if(!active)return;const from=scrollY,to=Math.max(0,Math.min(top,document.documentElement.scrollHeight-innerHeight)),began=performance.now();
  await new Promise(resolve=>{function frame(now){if(!active)return resolve();const t=Math.min(1,(now-began)/ms),ease=t*t*(3-2*t);window.scrollTo({top:from+(to-from)*ease,behavior:'instant'});if(t===1)resolve();else requestAnimationFrame(frame)}requestAnimationFrame(frame)});
 }
 async function tour(){
  await delay(1800);
  const sections=[...document.querySelectorAll('.year-section')];
  for(let i=0;i<sections.length&&active;i++){
   const section=sections[i];await moveTo(section.offsetTop-54);await delay(1200);
   const card=section.querySelector('.card');
   if(card&&active){card.classList.add('showcase-hover');await delay(1300);card.classList.remove('showcase-hover')}
   if(i===0&&card&&active){card.click();await delay(2400);document.querySelector('#detail').close();await delay(700)}
   const last=section.querySelector('.card:last-child');
   if(last&&active){const bottom=last.getBoundingClientRect().bottom+scrollY-innerHeight+70;if(bottom>scrollY+80){await moveTo(bottom,2000);await delay(1500)}}
  }
  if(active){await moveTo(document.documentElement.scrollHeight);await delay(2000);await moveTo(0,1800);await delay(1600)}
 }
 function reset(){active=false;document.querySelectorAll('.showcase-hover').forEach(card=>card.classList.remove('showcase-hover'));document.querySelector('#detail').close();document.documentElement.classList.remove('showcase-recording');panel.hidden=false;start.disabled=false;stream?.getTracks().forEach(track=>track.stop());stream=null}
 start.onclick=async()=>{
  if(active)return;
  if(!navigator.mediaDevices?.getDisplayMedia||!window.MediaRecorder){status.textContent='컴퓨터의 Chrome 또는 Edge에서 열어 주세요.';return}
  start.disabled=true;download.hidden=true;status.textContent='화면 공유 창에서 이 홈페이지 탭을 선택해 주세요.';
  try{
   // Call while the button activation is live; permission is always user selected.
   stream=await navigator.mediaDevices.getDisplayMedia({video:{displaySurface:'browser',frameRate:{ideal:30,max:30}},audio:false,preferCurrentTab:true,selfBrowserSurface:'include',surfaceSwitching:'exclude'});
   if(stream.getVideoTracks()[0]?.getSettings().displaySurface!=='browser'){reset();status.textContent='전체 화면 대신 현재 홈페이지 탭을 선택해 다시 시작해 주세요.';return}
   if(document.documentElement.classList.contains('copy-loading')){await Promise.race([new Promise(resolve=>{const observer=new MutationObserver(()=>{if(!document.documentElement.classList.contains('copy-loading')){observer.disconnect();resolve()}});observer.observe(document.documentElement,{attributes:true,attributeFilter:['class']})}),delay(6000)])}
   document.querySelectorAll('.portrait img').forEach(image=>image.loading='eager');
   await Promise.race([Promise.all([...document.querySelectorAll('.portrait img')].map(image=>image.decode().catch(()=>{}))),delay(10000)]);
   const missing=[...document.querySelectorAll('.portrait img')].filter(image=>!image.complete||!image.naturalWidth);
   if(missing.length){reset();status.textContent=`사진 ${missing.length}개를 불러오지 못했습니다. 홈페이지에서 이미지가 보이는지 확인한 후 다시 시도해 주세요.`;return}
   await document.fonts.ready;
   const mime=['video/webm;codecs=vp8','video/webm','video/mp4'].find(type=>MediaRecorder.isTypeSupported(type));
   recorder=new MediaRecorder(stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:6000000});const chunks=[];
   recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data)};
   recorder.onstop=()=>{const type=recorder.mimeType||'video/webm',blob=new Blob(chunks,{type});reset();if(savedUrl)URL.revokeObjectURL(savedUrl);savedUrl=URL.createObjectURL(blob);download.href=savedUrl;download.download='ONE-NAN-showcase.'+(type.includes('mp4')?'mp4':'webm');download.hidden=false;status.textContent='촬영이 끝났어요. 저장한 영상 파일을 채팅에 첨부하면 GIF와 포트폴리오 이미지를 만들 수 있어요.';download.click()};
   recorder.onerror=()=>{reset();status.textContent='녹화에 실패했습니다. 다시 시도해 주세요.'};
   stream.getVideoTracks()[0].addEventListener('ended',()=>{active=false;if(recorder?.state==='recording')recorder.stop()},{once:true});
   document.documentElement.classList.add('showcase-recording');panel.hidden=true;window.scrollTo({top:0,behavior:'instant'});await delay(300);
   active=true;recorder.start(1000);await tour();if(recorder.state==='recording')recorder.stop();
  }catch(error){reset();status.textContent=error.name==='NotAllowedError'?'화면 공유가 취소됐어요. 다시 시작할 수 있습니다.':'녹화를 시작하지 못했습니다. Chrome 또는 Edge에서 다시 시도해 주세요.'}
 };
})();

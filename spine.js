// One readable label: fit to the fixed rail, with a restrained scroll cascade.
(()=>{
 const rail=document.querySelector('.archive-spine'),line=rail.querySelector('.spine-line'),label=line.querySelector('[data-copy=spine]');
 const reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let rendered=null,letters=[],animations=[],lastScroll=scrollY,distance=0,lastWave=-Infinity,frame=null;
 function cancelWave(){animations.forEach(a=>a.cancel());animations=[]}
 function fit(){frame=null;const length=Math.max(1,line.offsetWidth),thickness=Math.max(1,line.offsetHeight);line.style.setProperty('--spine-stretch',Math.max(1,rail.clientHeight-48)/length);line.style.setProperty('--spine-cross',Math.max(1,rail.clientWidth-8)/thickness)}
 function requestFit(){if(frame===null)frame=requestAnimationFrame(fit)}
 function sync(){
  const text=label.textContent||'',editing=label.isContentEditable;
  if(editing){cancelWave();rendered=null;letters=[];line.removeAttribute('role');line.removeAttribute('aria-label');label.removeAttribute('aria-hidden');if(label.children.length)label.textContent=text;requestFit();return}
  if(text===rendered&&letters.length===Array.from(text).length&&letters.every(letter=>letter.parentNode===label))return;
  cancelWave();rendered=text;line.setAttribute('role','img');line.setAttribute('aria-label',text);label.setAttribute('aria-hidden','true');
  letters=Array.from(text).map(char=>{const span=document.createElement('span');span.className='spine-letter'+(char===' '?' spine-space':'');span.textContent=char;return span});
  label.replaceChildren(...letters);requestFit();
 }
 new MutationObserver(sync).observe(label,{childList:true,subtree:true,characterData:true});
 window.addEventListener('resize',requestFit,{passive:true});document.fonts.ready.then(requestFit);document.fonts.addEventListener('loadingdone',requestFit);
 window.addEventListener('scroll',()=>{
  const delta=scrollY-lastScroll;lastScroll=scrollY;if(reduced.matches||label.isContentEditable||!letters.length)return;
  distance+=Math.abs(delta);const now=performance.now();if(distance<70||now-lastWave<750)return;distance=0;lastWave=now;cancelWave();
  const direction=delta>=0?1:-1;
  animations=letters.map((letter,index)=>letter.animate([
   {transform:'translateX(0) rotate(0deg)'},
   {transform:`translateX(${direction*(4+(index%3))}px) rotate(${index%2?3:-3}deg)`,offset:.38},
   {transform:`translateX(${-direction*1.5}px) rotate(0deg)`,offset:.72},
   {transform:'translateX(0) rotate(0deg)'}
  ],{duration:440,delay:index*8,easing:'cubic-bezier(.22,.7,.25,1)'}));
 },{passive:true});
 reduced.addEventListener('change',()=>{if(reduced.matches)cancelWave()});sync();
})();

// Whole-word typography with intact proportions and meaningful reading progress.
(()=>{
 const rail=document.querySelector('.archive-spine'),line=rail.querySelector('.spine-line'),label=line.querySelector('[data-copy=spine]'),reduced=matchMedia('(prefers-reduced-motion:reduce)');
 let frame=null;
 function update(){
  frame=null;const availableLength=Math.max(1,rail.clientHeight-80),availableThickness=Math.max(1,rail.clientWidth-8);
  const fit=Math.min(1,availableLength/Math.max(1,line.offsetWidth),availableThickness/Math.max(1,line.offsetHeight));
  line.style.setProperty('--spine-fit',String(fit));
  const range=Math.max(0,document.documentElement.scrollHeight-innerHeight),progress=range?Math.min(1,Math.max(0,scrollY/range)):0;
  rail.style.setProperty('--reading-progress',String(progress));
  line.style.setProperty('--spine-drift',reduced.matches||label.isContentEditable?'0px':`${(progress-.5)*12}px`);
 }
 function requestUpdate(){if(frame===null)frame=requestAnimationFrame(update)}
 new MutationObserver(requestUpdate).observe(label,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['contenteditable']});
 new ResizeObserver(requestUpdate).observe(document.querySelector('main'));
 window.addEventListener('scroll',requestUpdate,{passive:true});window.addEventListener('resize',requestUpdate,{passive:true});reduced.addEventListener('change',requestUpdate);
 document.fonts.ready.then(requestUpdate);document.fonts.addEventListener('loadingdone',requestUpdate);requestUpdate();
})();

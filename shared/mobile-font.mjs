// Let the first visible portraits use the connection before the large font.
export function schedulePublicFont(){
 if(publicFontScheduled||!matchMedia('(pointer:coarse)').matches||typeof FontFace==='undefined')return;
 publicFontScheduled=true;
 const images=[...document.querySelectorAll('#archive .portrait img')].slice(0,2);
 let pending=images.filter(image=>!image.complete).length,started=false;
 const start=()=>{
  if(started)return;started=true;clearTimeout(deadline);
  const load=()=>{const font=new FontFace('OnulSamhwagothic-Regular',`url("${PUBLIC_FONT_URL}")`,{style:'normal',weight:'400',display:'swap'});font.load().then(loaded=>document.fonts.add(loaded)).catch(()=>{});};
  if(typeof requestIdleCallback==='function')requestIdleCallback(load,{timeout:2000});else setTimeout(load,0);
 };
 const settled=()=>{pending--;if(pending<=0)start();};
 const deadline=setTimeout(start,12000);
 for(const image of images){if(image.complete)continue;image.addEventListener('load',settled,{once:true});image.addEventListener('error',settled,{once:true});}
 if(!pending)start();
}
let publicFontScheduled=false;

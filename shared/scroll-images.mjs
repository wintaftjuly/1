let scrollImageCleanup;
export function prepareScrollImages(){
 scrollImageCleanup?.();
 const images=[...document.querySelectorAll('#archive .portrait img')];
 const first=images.slice(0,4),rest=images.slice(4);
 if(!rest.length||typeof IntersectionObserver==='undefined')return;
 let observer,started=false,cancelled=false;
 const start=()=>{
  if(started||cancelled)return;started=true;clearTimeout(deadline);
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries){if(!entry.isIntersecting)continue;entry.target.loading='eager';observer.unobserve(entry.target);}
  },{rootMargin:'2000px 0px',threshold:0});
  rest.forEach(image=>observer.observe(image));
 };
 let pending=first.filter(image=>!image.complete).length;
 const settled=()=>{pending--;if(pending<=0)start();};
 const deadline=setTimeout(start,10000);
 first.filter(image=>!image.complete).forEach(image=>{image.addEventListener('load',settled,{once:true});image.addEventListener('error',settled,{once:true});});
 scrollImageCleanup=()=>{cancelled=true;clearTimeout(deadline);observer?.disconnect();first.forEach(image=>{image.removeEventListener('load',settled);image.removeEventListener('error',settled);});};
 if(!pending)start();
}

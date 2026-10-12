let scrollImageCleanup;
export function prepareScrollImages(){
 scrollImageCleanup?.();
 const images=[...document.querySelectorAll('#archive .portrait img')];
 const first=images.slice(0,4),rest=images.slice(4);
 if(!rest.length||typeof IntersectionObserver==='undefined')return;
 let observer,started=false,cancelled=false,active=0;const queue=[],controllers=new Set();
 const pump=()=>{
  while(!cancelled&&active<2&&queue.length){
   const image=queue.shift();if(image.complete&&image.naturalWidth>0)continue;
   const url=new URL(image.currentSrc||image.src,location.href);if(url.origin!==location.origin)continue;
   const controller=new AbortController();controllers.add(controller);active++;
   const timeout=setTimeout(()=>controller.abort(),8000);
   // Fetch fills the browser cache without turning offscreen images into
   // eager resources that postpone the document's load event.
   fetch(url.href,{cache:'force-cache',priority:'low',signal:controller.signal}).then(response=>{if(response.ok)return response.arrayBuffer();}).catch(()=>{}).finally(()=>{clearTimeout(timeout);controllers.delete(controller);active--;pump();});
  }
 };
 const start=()=>{
  if(started||cancelled)return;started=true;clearTimeout(deadline);
  observer=new IntersectionObserver(entries=>{
   for(const entry of entries){if(!entry.isIntersecting)continue;queue.push(entry.target);observer.unobserve(entry.target);}pump();
  },{rootMargin:'2000px 0px',threshold:0});
  rest.forEach(image=>observer.observe(image));
 };
 let pending=first.filter(image=>!image.complete).length;
 const settled=()=>{pending--;if(pending<=0)start();};
 const deadline=setTimeout(start,10000);
 first.filter(image=>!image.complete).forEach(image=>{image.addEventListener('load',settled,{once:true});image.addEventListener('error',settled,{once:true});});
 scrollImageCleanup=()=>{cancelled=true;clearTimeout(deadline);observer?.disconnect();controllers.forEach(controller=>controller.abort());first.forEach(image=>{image.removeEventListener('load',settled);image.removeEventListener('error',settled);});};
 if(!pending)start();
}

export async function fetchPublished(url,timeout=5000) {
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 try{const response=await fetch(url,{cache:'no-store',signal:controller.signal});const body=await response.arrayBuffer();return new Response(body,{status:response.status,headers:response.headers})}finally{clearTimeout(timer)}
}

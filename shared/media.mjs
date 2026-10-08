export function isHttpsImageUrl(value) {
 if (typeof value !== 'string' || value.length > 2048 || !/^https:\/\/\S+$/i.test(value)) return false;
 try {const url=new URL(value);return url.protocol==='https:' && !!url.hostname && !url.username && !url.password} catch {return false}
}
export function isAllowedImage(value) {
 return typeof value==='string' && (/^assets\/portrait-[1-8]\.svg$/.test(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) || isHttpsImageUrl(value));
}

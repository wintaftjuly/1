// Keep each card's random angle stable during edits and data refreshes.
const cardAngles = new Map();
const cardTapes = new Map();
export function applyCardAngle(card,id) {
 if(!cardAngles.has(id))cardAngles.set(id,((Math.random()<.5?-1:1)*(.6+Math.random()*.6)).toFixed(3)+'deg');
 card.style.setProperty('--card-angle',cardAngles.get(id));
}
export function applyCardTape(card,id) {
 if(!cardTapes.has(id))cardTapes.set(id,{index:Math.floor(Math.random()*BUNDLED_TAPES.length),x:(Math.random()-.5)*10,y:(Math.random()-.5)*6,angle:(Math.random()-.5)*14,scale:.94+Math.random()*.12});
 const placement=cardTapes.get(id),asset=BUNDLED_TAPES[placement.index];
 const tape=document.createElement('span');tape.className='card-tape';tape.setAttribute('aria-hidden','true');
 tape.dataset.tape=String(placement.index+1);
 tape.style.backgroundImage='url("'+asset.src+'")';
 tape.style.aspectRatio=asset.ratio;
 tape.style.setProperty('--tape-width',asset.width+'px');
 tape.style.setProperty('--tape-x',placement.x+'px');
 tape.style.setProperty('--tape-y',placement.y+'px');
 tape.style.setProperty('--tape-angle',placement.angle+'deg');
 tape.style.setProperty('--tape-scale',placement.scale);
 card.append(tape);
}

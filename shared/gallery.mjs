// Keep each card's random angle stable during edits and data refreshes.
const cardAngles = new Map();
export function applyCardAngle(card,id) {
 if(!cardAngles.has(id))cardAngles.set(id,((Math.random()<.5?-1:1)*(.6+Math.random()*.6)).toFixed(3)+'deg');
 card.style.setProperty('--card-angle',cardAngles.get(id));
}

let draggedCharacter=null;
function clearManagerDrag(){document.querySelectorAll('.manage-row').forEach(row=>row.classList.remove('dragging','drop-before','drop-after'))}
function saveCharacterOrder(sourceId,targetId,after){
 const next=reorderWithinYear(records,sourceId,targetId,after);
 if(next===records||next.every((row,i)=>row.id===records[i].id))return;
 if(persist(next))toast('순서를 저장했습니다. 공개 사이트에 게시하면 반영됩니다.');
}
function addOrderControls(row,record){
 row.dataset.characterId=record.id;
 const handle=el('button','order-handle','⠿');handle.type='button';handle.draggable=true;
 handle.setAttribute('aria-label',record.name+' 순서 이동');
 handle.title='드래그하여 순서 변경 · 방향키 ↑ ↓로도 이동';
 handle.ondragstart=event=>{draggedCharacter=record.id;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',record.id);event.dataTransfer.setDragImage(row,24,24);row.classList.add('dragging')};
 handle.ondragend=()=>{draggedCharacter=null;clearManagerDrag()};
 row.ondragover=event=>{
  const source=records.find(item=>item.id===draggedCharacter);
  if(!source||source.id===record.id||source.year!==record.year)return;
  event.preventDefault();event.dataTransfer.dropEffect='move';clearManagerDrag();
  row.classList.add(event.clientY>row.getBoundingClientRect().top+row.offsetHeight/2?'drop-after':'drop-before');
 };
 row.ondragleave=event=>{if(!row.contains(event.relatedTarget))row.classList.remove('drop-before','drop-after')};
 row.ondrop=event=>{
  if(!draggedCharacter)return;event.preventDefault();
  const source=draggedCharacter,after=event.clientY>row.getBoundingClientRect().top+row.offsetHeight/2;
  draggedCharacter=null;clearManagerDrag();saveCharacterOrder(source,record.id,after);
 };
 const controls=el('div','order-buttons');
 const siblings=records.filter(item=>item.year===record.year),index=siblings.findIndex(item=>item.id===record.id);
 function move(direction){const target=siblings[index+direction];if(!target)return;saveCharacterOrder(record.id,target.id,direction>0);document.querySelectorAll('.manage-row').forEach(item=>{if(item.dataset.characterId===record.id)item.querySelector('.order-handle').focus()})}
 handle.onkeydown=event=>{if(event.key==='ArrowUp'||event.key==='ArrowDown'){event.preventDefault();move(event.key==='ArrowUp'?-1:1)}};
 for(const [direction,label] of [[-1,'↑'],[1,'↓']]){const button=el('button','order-step',label);button.type='button';button.disabled=!siblings[index+direction];button.setAttribute('aria-label',record.name+(direction<0?' 앞으로 이동':' 뒤로 이동'));button.onclick=()=>move(direction);controls.append(button)}
 row.prepend(handle);row.append(controls);row.querySelector('img').draggable=false;
}

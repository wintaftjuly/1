// Included only in the protected editor bundle.
let publishing = false;
$('#publish-open').onclick = () => {
 if (copyEditing) {toast('문구 편집의 저장 버튼을 먼저 눌러 주세요.');return;}
 $('#publish-summary').textContent = `캐릭터 ${records.length}명 · ${new Set(records.map(r=>r.year)).size}개 연도 · 사이트 문구`;
 $('#publish-status').textContent = ''; $('#publish-dialog').showModal();
};
$('#publish-dialog [data-close]').onclick = () => {if(!publishing)$('#publish-dialog').close()};
$('#publish-dialog').addEventListener('cancel',event=>{if(publishing)event.preventDefault()});
$('#publish-confirm').onclick = async () => {
 if (publishing) return;
 publishing=true;$('#publish-confirm').disabled=true;$('#publish-confirm').textContent='게시 중…';
 $('#publish-status').textContent='사진과 문구를 안전하게 저장하고 있습니다.';
 try {
  const body=JSON.stringify({archive:validate(records),settings:validateCopy(siteCopy)});
  if(new Blob([body]).size>24*1024*1024)throw Error('전체 자료가 24MB를 넘습니다. 사진 크기를 줄여 주세요.');
  const response=await fetch('/api/publish',{method:'POST',headers:{'Content-Type':'application/json'},body});
  const type=response.headers.get('Content-Type')||'';
  if(!type.includes('application/json'))throw Error('관리 페이지의 로그인 또는 Cloudflare 배포 설정을 확인해 주세요.');
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'게시하지 못했습니다.');
  $('#publish-status').textContent='게시했습니다. 공개 사이트에서 새로고침해 확인하세요. 반영까지 약 1분 걸릴 수 있습니다.';
  toast('공개 사이트에 게시했습니다.');
 } catch(error){$('#publish-status').textContent=error.message||'게시하지 못했습니다. 변경 사항은 이 브라우저에 남아 있습니다.'}
 finally{publishing=false;$('#publish-confirm').disabled=false;$('#publish-confirm').textContent='지금 게시하기'}
};

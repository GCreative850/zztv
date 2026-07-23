(()=>{
  'use strict';
  const $ = (s) => document.querySelector(s);
  const css = document.createElement('style');
  css.textContent = `.tiktokCard{border:1px solid #343849;background:linear-gradient(180deg,#171a25,#10121a);border-radius:20px;padding:18px;margin-top:16px}.tiktokHead{display:flex;align-items:center;justify-content:space-between;gap:12px}.tiktokMark{width:48px;height:48px;border-radius:15px;display:grid;place-items:center;background:#050505;font-weight:1000;font-size:22px;box-shadow:-3px 0 #25f4ee,3px 0 #fe2c55}.tiktokAccount{display:flex;align-items:center;gap:10px}.tiktokAvatar{width:42px;height:42px;border-radius:50%;object-fit:cover;background:#222}.tiktokActions{display:grid;gap:10px;margin-top:14px}.tiktokNote{font-size:12px;line-height:1.45;color:#aeb5c8}.tiktokGood{color:#75e6a7}.tiktokError{color:#ff9aa8}`;
  document.head.appendChild(css);

  function toast(text){const el=$('#toast');if(!el)return;el.textContent=text;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2200)}
  function insertCard(){
    const workspace=$('#workspace'); if(!workspace||$('#tiktokCard')) return;
    const cards=[...workspace.querySelectorAll('.card')];
    const target=cards[cards.length-1];
    const section=document.createElement('section');
    section.id='tiktokCard';section.className='tiktokCard';
    section.innerHTML=`<div class="tiktokHead"><div class="tiktokAccount"><div class="tiktokMark">♪</div><div><div class="eyebrow">TIKTOK CONNECTION</div><strong id="tiktokName">Checking connection…</strong></div></div><span class="statusText" id="tiktokBadge">WAIT</span></div><div class="tiktokActions"><a class="btn primary" id="tiktokConnect" href="/api/tiktok/start">Connect TikTok</a><button class="btn primary" id="tiktokUpload" disabled>Upload Finished Video to TikTok</button><button class="btn secondary" id="tiktokCheck" hidden>Check Upload Status</button></div><div class="tiktokNote" id="tiktokMessage">TikTok receives the finished video as a draft. Open the TikTok inbox notification to review, edit and publish it.</div>`;
    target ? workspace.insertBefore(section,target) : workspace.appendChild(section);
    $('#tiktokUpload').onclick=uploadVideo;
    $('#tiktokCheck').onclick=checkUpload;
    refreshStatus();
  }

  let publishId='';
  async function refreshStatus(){
    const name=$('#tiktokName'),badge=$('#tiktokBadge'),connect=$('#tiktokConnect'),upload=$('#tiktokUpload'),message=$('#tiktokMessage');
    try{
      const r=await fetch('/api/tiktok/status');const data=await r.json();
      if(data.connected){
        name.textContent=data.user?.display_name||'TikTok connected';
        badge.textContent='CONNECTED';badge.className='statusText tiktokGood';
        connect.hidden=true;upload.disabled=false;
        message.textContent='Connected. Render a finished video, then upload it to your TikTok drafts.';
      }else{
        name.textContent=data.configured?'TikTok not connected':'TikTok setup required';
        badge.textContent='OFFLINE';badge.className='statusText';connect.hidden=false;upload.disabled=true;
        message.textContent=data.configured?'Tap Connect TikTok and approve access.':'Add TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET in Vercel first.';
      }
    }catch(e){name.textContent='TikTok unavailable';badge.textContent='ERROR';badge.className='statusText tiktokError';message.textContent=e.message}
  }

  async function uploadVideo(){
    const video=$('#videoResult'),button=$('#tiktokUpload'),message=$('#tiktokMessage');
    if(!video?.src) return toast('Build the finished video first');
    button.disabled=true;button.textContent='Preparing Upload…';
    try{
      const blob=await fetch(video.src).then(r=>r.blob());
      const init=await fetch('/api/tiktok/init-upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({video_size:blob.size})});
      const data=await init.json(); if(!init.ok) throw new Error(data.error||'TikTok upload could not start.');
      button.textContent='Uploading to TikTok…';
      const upload=await fetch(data.upload_url,{method:'PUT',headers:{'Content-Type':blob.type||'video/mp4','Content-Range':`bytes 0-${blob.size-1}/${blob.size}`},body:blob});
      if(!upload.ok&&upload.status!==201&&upload.status!==206) throw new Error(`TikTok upload failed (${upload.status}).`);
      publishId=data.publish_id;$('#tiktokCheck').hidden=false;
      message.textContent='Upload complete. Open TikTok and tap the inbox notification to finish editing and publish.';
      toast('Video sent to TikTok drafts');
    }catch(e){message.textContent=e.message;toast(e.message)}finally{button.disabled=false;button.textContent='Upload Finished Video to TikTok'}
  }

  async function checkUpload(){
    if(!publishId)return;
    const message=$('#tiktokMessage');
    try{const r=await fetch('/api/tiktok/post-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({publish_id:publishId})});const data=await r.json();if(!r.ok)throw new Error(data.error||'Status check failed.');message.textContent=`TikTok status: ${data.status||'processing'}${data.fail_reason?` — ${data.fail_reason}`:''}`;}catch(e){message.textContent=e.message}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',insertCard);else insertCard();
})();

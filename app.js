(()=>{
  const load=(src,onerror)=>{const script=document.createElement('script');script.src=src;script.defer=true;if(onerror)script.onerror=onerror;document.head.appendChild(script);};
  load('/studio.js',()=>{const toast=document.querySelector('#toast');if(toast){toast.textContent='ZZTV Studio failed to load. Refresh the page.';toast.classList.add('show');}});
  load('/tiktok-ui.js');
})();

(()=>{
  const script = document.createElement('script');
  script.src = '/studio.js';
  script.defer = true;
  script.onerror = () => {
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = 'ZZTV Studio failed to load. Refresh the page.';
      toast.classList.add('show');
    }
  };
  document.head.appendChild(script);
})();

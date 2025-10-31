// Navigation, smooth scroll, QR modal, and interaction wiring
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  function initNavigation(){
    const toggle = qs('.nav-toggle');
    const menu = qs('#nav-menu');
    const links = qsa('.nav-link', menu);
    if(!toggle || !menu) return;

    function open(){ menu.classList.add('open'); document.body.classList.add('menu-open'); toggle.setAttribute('aria-expanded','true'); }
    function close(){ menu.classList.remove('open'); document.body.classList.remove('menu-open'); toggle.setAttribute('aria-expanded','false'); }
    toggle.addEventListener('click', ()=>{
      if(menu.classList.contains('open')) close(); else open();
    });
    document.addEventListener('click', (e)=>{
      if(!menu.classList.contains('open')) return;
      const within = menu.contains(e.target) || toggle.contains(e.target);
      if(!within) close();
    });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') close(); });
    links.forEach(a=> a.addEventListener('click', ()=> close()));

    // smooth anchor scroll
    links.forEach(a=>{
      a.addEventListener('click', (e)=>{
        const href = a.getAttribute('href');
        if(href && href.startsWith('#')){
          e.preventDefault();
          const el = qs(href);
          if(el) el.scrollIntoView({behavior:'smooth', block:'start'});
        }
      });
    });
  }

  function createScrollProgressBar(){
    const bar = qs('#scrollProgress'); if(!bar) return;
    function update(){
      const y = window.scrollY; const h = document.body.scrollHeight - window.innerHeight;
      const p = Math.max(0, Math.min(1, h ? y/h : 0));
      bar.style.transform = `scaleX(${p})`;
    }
    update(); window.addEventListener('scroll', update, {passive:true});
  }

  function initInteractiveElements(){
    // Tilt and magnetic effects
    qsa('.tilt').forEach(el => window.CVAnimations?.tilt(el, 10));
    qsa('.magnetic').forEach(el => window.CVAnimations?.magnetic(el));

    // QR modal
    const openers = [qs('#shareBtn'), qs('#openQRBottom')].filter(Boolean);
    const modal = qs('#qrModal');
    const img = qs('#qrImage');
    const closeBtns = qsa('[data-close-modal]', modal);
    function openModal(){
      if(!modal || !img) return;
      const url = location.href;
      const api = `https://chart.googleapis.com/chart?cht=qr&chs=220x220&chl=${encodeURIComponent(url)}`;
      img.src = api; modal.setAttribute('aria-hidden','false');
    }
    function closeModal(){ modal?.setAttribute('aria-hidden','true'); }
    openers.forEach(btn => btn.addEventListener('click', openModal));
    closeBtns.forEach(btn => btn.addEventListener('click', closeModal));
    modal?.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal(); });
  }

  // Page transition: intercept navigation to auth/login.html (and similar) and fade out
  function initPageTransitions(){
    document.addEventListener('click', (e)=>{
      const a = e.target.closest && e.target.closest('a');
      if(!a) return;
      const href = a.getAttribute('href') || '';
      // Only intercept same-origin local navigations to the demo login to animate
      if(href.includes('auth/login.html') || href.endsWith('/auth/login.html')){
        e.preventDefault();
        document.body.classList.add('page-exit');
        // small delay to allow CSS to animate
        setTimeout(()=>{ window.location.href = href; }, 360);
      }
    });
  }

  // Boot
  document.addEventListener('DOMContentLoaded', ()=>{
    initNavigation();
    createScrollProgressBar();
    initInteractiveElements();
    initPageTransitions();
  });
})();

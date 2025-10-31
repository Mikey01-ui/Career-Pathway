// Reveal-on-scroll, counters, and small interactive helpers
(function(){
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  
  // Detect if user prefers reduced motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
  // Detect touch device
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Intersection Observer for .reveal / .reveal-up
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add('inview');
        io.unobserve(e.target);
      }
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.06 });
  qsa('.reveal, .reveal-up').forEach(el => io.observe(el));

  // Counters
  function animateCounter(el){
    const to = parseInt(el.getAttribute('data-to')||'0', 10);
    const dur = prefersReducedMotion ? 800 : 1400; 
    const start = performance.now();
    const startVal = 0;
    function tick(ts){
      const p = Math.min(1, (ts - start) / dur);
      const ease = 1 - Math.pow(1-p, 3);
      const val = Math.floor(startVal + (to - startVal) * ease);
      el.textContent = val.toLocaleString();
      if(p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  const cio = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        animateCounter(e.target);
        cio.unobserve(e.target);
      }
    }
  },{rootMargin:'0px 0px -10% 0px', threshold: 0.4});
  qsa('.counter').forEach(el => cio.observe(el));

  // Export simple helpers
  window.CVAnimations = {
    tilt(el, strength=10){
      if(!el || prefersReducedMotion) return;
      
      // Reduce strength on touch devices for better performance
      const adjustedStrength = isTouchDevice ? strength * 0.5 : strength;
      
      const r = el.getBoundingClientRect();
      function onMove(e){
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateX(${(-y*adjustedStrength)}deg) rotateY(${x*adjustedStrength}deg)`;
      }
      function onLeave(){ 
        el.style.transform = ''; 
      }
      
      // Add touch support
      function onTouchMove(e){
        e.preventDefault();
        const touch = e.touches[0];
        const x = (touch.clientX - r.left) / r.width - 0.5;
        const y = (touch.clientY - r.top) / r.height - 0.5;
        el.style.transform = `rotateX(${(-y*adjustedStrength*0.5)}deg) rotateY(${x*adjustedStrength*0.5}deg)`;
      }
      
      if(isTouchDevice){
        el.addEventListener('touchstart', (e) => {
          const rect = el.getBoundingClientRect();
          r.left = rect.left; r.top = rect.top; r.width = rect.width; r.height = rect.height;
        });
        el.addEventListener('touchmove', onTouchMove, { passive: false });
        el.addEventListener('touchend', onLeave);
      } else {
        el.addEventListener('mousemove', onMove);
        el.addEventListener('mouseleave', onLeave);
      }
    },
    
    magnetic(el, radius=30){
      if(!el || prefersReducedMotion || isTouchDevice) return;
      
      const parent = el.parentElement || document.body;
      function onMove(e){
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width/2; const cy = r.top + r.height/2;
        const dx = (e.clientX - cx); const dy = (e.clientY - cy);
        const dist = Math.hypot(dx, dy);
        if(dist < 120){
          const f = Math.max(0, 1 - dist/120) * 8;
          el.style.transform = `translate(${dx/24}px, ${dy/24}px)`;
          el.style.boxShadow = '0 14px 30px rgba(124,58,237,.35)';
        } else { 
          el.style.transform=''; 
          el.style.boxShadow=''; 
        }
      }
      function onLeave(){ 
        el.style.transform=''; 
        el.style.boxShadow=''; 
      }
      parent.addEventListener('mousemove', onMove);
      parent.addEventListener('mouseleave', onLeave);
    }
  }
})();

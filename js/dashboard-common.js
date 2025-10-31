// Shared dashboard utilities: auth check, navigation, utilities
(function(){
  'use strict';

  const qs = (s, r = document) => r.querySelector(s);
  const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));

  // If demo layer didn't override, fallback to fetch
  if (!window.apiRequest) {
    window.apiRequest = async function (endpoint, options = {}) {
      const res = await fetch(endpoint, options);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.json();
    };
  }

  async function getCurrentUser() {
    try {
      return await window.apiRequest('/api/auth/me');
    } catch (err) {
      return null;
    }
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch (e) {
      return iso;
    }
  }

  function formatCurrency(n) {
    try {
      return new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' }).format(n);
    } catch (e) {
      return `€${n}`;
    }
  }

  function showNotification(msg, type = 'info') {
    const n = document.createElement('div');
    n.className = `toast ${type}`;
    n.textContent = msg;
    Object.assign(n.style, {
      position: 'fixed',
      right: '16px',
      bottom: '16px',
      background: 'rgba(0,0,0,.7)',
      color: '#fff',
      padding: '10px 12px',
      borderRadius: '10px',
      border: '1px solid rgba(255,255,255,.16)',
      zIndex: 10000
    });
    document.body.appendChild(n);
    // fade then remove to smooth the UX and avoid abrupt layout changes
    try { n.style.transition = 'opacity 280ms ease'; n.style.opacity = '1'; } catch (e) { }
    setTimeout(() => {
      try { n.style.opacity = '0'; } catch (err) { /* ignore */ }
    }, 2200);
    setTimeout(() => {
      try { n.remove(); } catch (err) { /* ignore */ }
    }, 2500);
  }

  class DashboardCommon {
    constructor() {
      this.user = null;
      this.currentSection = null;
    }

    async init() {
      // Read user from URL if present (demo layer may pass a base64 user)
      const urlParams = new URLSearchParams(window.location.search);
      let user = null;
      if (urlParams.has('user')) {
        try {
          user = JSON.parse(atob(decodeURIComponent(urlParams.get('user'))));
          try { localStorage.setItem('user', JSON.stringify(user)); } catch (err) { console.warn('persist demo user failed', err); }
        } catch (err) {
          console.warn('parse demo user from URL failed', err);
        }
      }

      if (!user) user = await getCurrentUser();
      this.user = user;

      try { window.currentUser = this.user; } catch (err) { /* ignore */ }
      // If there's no authenticated user, support file:// previews by auto-selecting
      // the first demo employer (if available). This lets you open dashboard HTML
      // files directly in the browser without running a server or using the console.
      if (!this.user) {
        try {
          if (location && location.protocol === 'file:' && window.demoAccounts && Array.isArray(window.demoAccounts)) {
            const demoEmp = window.demoAccounts.find(a => a.type === 'employer');
            if (demoEmp) {
              try { localStorage.setItem('user', JSON.stringify(demoEmp)); } catch (e) { /* ignore */ }
              this.user = demoEmp;
              try { window.currentUser = this.user; } catch (e) { /* ignore */ }
              try { showNotification && showNotification('Auto-signed in as demo employer for file:// preview', 'info'); } catch (e) { }
            }
          }
        } catch (e) { /* ignore file:// fallback errors */ }
      }
      if (!this.user) { window.location.href = '../auth/login.html'; return; }

      this.bindNav();
      const first = qs('[data-section]');
      if (first) this.showSection(first.getAttribute('data-section'));
      this.fillUserPill();

      // Restore compact mode preference
      try {
        const compact = localStorage.getItem('compactMode') === 'true';
        document.body.classList.toggle('compact', compact);
      } catch (err) { /* ignore */ }

      // Compact toggle button
      try {
        const btn = qs('#compactToggle');
        if (btn) {
          btn.addEventListener('click', () => {
            try {
              const is = document.body.classList.toggle('compact');
              localStorage.setItem('compactMode', is ? 'true' : 'false');
              const lbl = btn.querySelector('.label');
              if (lbl) lbl.textContent = is ? 'Compact ✓' : 'Compact';
              else btn.textContent = is ? 'Compact ✓' : 'Compact';
            } catch (err) { /* ignore */ }
          });
          const initLbl = btn.querySelector && btn.querySelector('.label');
          if (initLbl) initLbl.textContent = document.body.classList.contains('compact') ? 'Compact ✓' : 'Compact';
          else btn.textContent = document.body.classList.contains('compact') ? 'Compact ✓' : 'Compact';
        }
      } catch (err) { /* ignore */ }

      // Tour button
      try {
        const tourBtn = qs('#helpTourBtn');
        if (tourBtn) tourBtn.addEventListener('click', () => showDashboardTour());
      } catch (err) { /* ignore */ }

      // Clear demo data button (convenience): wipes demo jobs/messages/flags from localStorage
      try {
        const headerInner = qs('.dash-header .inner') || document.body;
        if (headerInner && !qs('#clearDemoBtn')) {
          const clearBtn = document.createElement('button');
          clearBtn.id = 'clearDemoBtn';
          clearBtn.className = 'btn btn-outline';
          clearBtn.textContent = 'Clear demo';
          clearBtn.title = 'Clear demo data from this browser (messages, jobs, demo flags)';
          clearBtn.style.marginLeft = '8px';
          clearBtn.addEventListener('click', () => {
            try {
              if (!confirm('Clear demo data from this browser? This will remove demo messages, jobs and demo flags.')) return;
              const keys = Object.keys(localStorage || {});
              keys.forEach(k => {
                try {
                  if (k && (k.startsWith('demoMessages_') || k.startsWith('demoJobs_') || k.startsWith('demoAutoSeeded_') || k.startsWith('demoApplications_') || k.startsWith('demoLastRead_') || k === 'seenDemoTour' || k === 'compactMode')) {
                    localStorage.removeItem(k);
                  }
                } catch (e) { /* ignore individual removal errors */ }
              });
              try { showNotification && showNotification('Demo data cleared locally', 'info'); } catch (e) {}
              setTimeout(() => { try { location.reload(); } catch (e) {} }, 600);
            } catch (err) { /* ignore */ }
          });
          headerInner.appendChild(clearBtn);
        }
      } catch (err) { /* ignore */ }

      // Auto-show tour once
      try {
        const seen = localStorage.getItem('seenDemoTour');
        if (!seen) setTimeout(() => { try { showDashboardTour(); localStorage.setItem('seenDemoTour', '1'); } catch (err) { /* ignore */ } }, 800);
      } catch (err) { /* ignore */ }

      // Global keyboard shortcuts: Shift+/ for tour, Ctrl/Cmd+, to toggle compact, Ctrl/Cmd+M to open Messages
      try {
        document.addEventListener('keydown', (e) => {
          try {
            const mod = e.ctrlKey || e.metaKey;
            // Shift + / (?). On many layouts Shift+/ is '?'
            if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
              e.preventDefault();
              showDashboardTour();
              return;
            }
            // Ctrl/Cmd + , to toggle compact mode
            if (mod && e.key === ',') {
              e.preventDefault();
              try { this.toggleCompact(); } catch (err) { /* ignore */ }
              try { showNotification('Compact toggled', 'info'); } catch (err) { }
              return;
            }
            // Ctrl/Cmd + M to open Messages (if nav exists)
            if (mod && (e.key === 'm' || e.key === 'M')) {
              e.preventDefault();
              try {
                let msg = qs('[data-nav="messages"]') || qsa('[data-nav]').find(a => { const v = a.getAttribute('data-nav')||''; return v.toLowerCase().includes('message'); });
                if (msg) msg.click();
              } catch (err) { /* ignore */ }
            }
          } catch (err) { /* ignore key handler errors */ }
        });
      } catch (err) { /* ignore */ }
    }

    // programmatic compact toggle
    toggleCompact(state) {
      try {
        const is = (typeof state === 'boolean') ? state : !document.body.classList.contains('compact');
        document.body.classList.toggle('compact', is);
        localStorage.setItem('compactMode', is ? 'true' : 'false');
        const btn = qs('#compactToggle'); if (btn) {
          const lbl = btn.querySelector && btn.querySelector('.label');
          if (lbl) lbl.textContent = is ? 'Compact ✓' : 'Compact'; else btn.textContent = is ? 'Compact ✓' : 'Compact';
        }
      } catch (err) { /* ignore */ }
    }

    bindNav() {
      qsa('[data-section]').forEach(s => s.classList.remove('active'));
      qsa('[data-nav]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          const sec = link.getAttribute('data-nav');
          this.showSection(sec);
        });
      });
    }

    showSection(id) {
        qsa('[data-section]').forEach(s => s.classList.toggle('active', s.getAttribute('data-section') === id));
        qsa('[data-nav]').forEach(a => a.setAttribute('aria-current', a.getAttribute('data-nav') === id ? 'page' : 'false'));
        const head = qs(`#${id}-head`);
        if (head) {
          try {
            // If the target section contains a canvas (Chart.js) defer focusing slightly to allow
            // the chart to render/responsive-resize without the browser attempting to scroll the
            // focused element into view. This prevents layout-driven auto-scrolling.
            const section = qs(`[data-section="${id}"]`);
            if (section && section.querySelector && section.querySelector('canvas')) {
              setTimeout(() => { try { safeFocus(head); } catch (e) {} }, 300);
            } else {
              safeFocus(head);
            }
          } catch (e) { safeFocus(head); }
        }
      this.currentSection = id;
    }

    fillUserPill() {
      const nameEl = qs('#userName');
      const avatar = qs('#userAvatar');
      if (nameEl && this.user) nameEl.textContent = this.user.name || this.user.email;
      if (!avatar || !this.user) return;
      if (this.user.photo) {
        avatar.style.background = 'transparent'; avatar.style.overflow = 'hidden';
        avatar.innerHTML = `<img src="${this.user.photo}" alt="avatar" style="width:clamp(24px,6vw,36px);height:clamp(24px,6vw,36px);border-radius:50%;object-fit:cover;display:block;" />`;
      } else {
        avatar.innerHTML = '';
        avatar.style.background = this.user.avatarColor || 'linear-gradient(135deg, var(--primary), var(--accent))';
      }
    }
  }

  window.DashboardCommon = DashboardCommon;

  // safe focus helper: attempts focus with preventScroll then falls back
  function safeFocus(el) {
    if (!el) return;
    try {
      // Prefer the browser-native preventScroll option when available
      el.focus({ preventScroll: true });
      return;
    } catch (err) {
      try {
        // Fallback: make element programmatically focusable without moving viewport
        const x = window.scrollX || window.pageXOffset || 0;
        const y = window.scrollY || window.pageYOffset || 0;
        const hadTab = el.hasAttribute('tabindex');
        const prevTab = hadTab ? el.getAttribute('tabindex') : null;
        try {
          if (!hadTab) el.setAttribute('tabindex', '-1');
          el.focus();
        } catch (e) {
          // best-effort
        }
        // restore previous tabindex if we added it
        try {
          if (!hadTab) el.removeAttribute('tabindex');
          else if (prevTab !== null) el.setAttribute('tabindex', prevTab);
        } catch (e) {}
        // restore scroll position to avoid viewport jumping
        try { window.scrollTo(x, y); } catch (e) {}
        return;
      } catch (e) {
        try { console.debug && console.debug('safeFocus failed', e); } catch(_) { }
      }
    }
  }

  // small helpers
  function timeAgo(dateish) {
    try {
      const d = (typeof dateish === 'string' || typeof dateish === 'number') ? new Date(dateish) : dateish;
      const diff = Math.floor((Date.now() - d.getTime()) / 1000);
      if (diff < 10) return 'just now';
      if (diff < 60) return `${diff}s`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
      return `${Math.floor(diff / 86400)}d`;
    } catch (err) { return String(dateish); }
  }

  function applyTimestampTooltips(root = document) {
    const els = qsa('[data-ts]', root);
    if (!els || !els.length) return;
    els.forEach(el => {
      const v = el.getAttribute('data-ts');
      if (!v) return;
      try {
        const dt = new Date(v);
        el.title = dt.toLocaleString();
        el.textContent = timeAgo(dt);
        el.setAttribute('data-ts-tracked', '1');
      } catch (err) { /* ignore */ }
    });
    startTimestampUpdater();
  }

  function startTimestampUpdater() {
    try {
      if (window.__dashboardTsInterval) return;
      window.__dashboardTsInterval = setInterval(() => {
        qsa('[data-ts][data-ts-tracked]').forEach(el => {
          try {
            const v = el.getAttribute('data-ts');
            if (!v) return;
            const dt = new Date(v);
            el.textContent = timeAgo(dt);
          } catch (err) { /* ignore individual failures */ }
        });
      }, 60 * 1000);
    } catch (err) { /* ignore */ }
  }

  function debounce(fn, wait = 100) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  window.dashboardUtils = { formatDate, formatCurrency, showNotification, getCurrentUser, timeAgo, applyTimestampTooltips, debounce, safeFocus };

  // Simple in-page tour overlay (demo convenience)
  function showDashboardTour() {
    try {
      if (document.getElementById('demoTourOverlay')) return;
      const steps = [
        { title: 'Welcome to ChronoVize', text: 'This quick tour highlights the messaging demo, export and compact mode. Click Next to continue.' },
        { title: 'Messages', text: 'Open Messages to view and send messages. Use the Simulate buttons to quickly seed demo messages.' },
        { title: 'Export', text: 'Use Export to download the conversation as a text file for demos or grading.' },
        { title: 'Compact view', text: 'Toggle Compact to see a denser layout for presentations.' },
        { title: 'Keyboard shortcuts', html: 'Shortcuts: <span class="kbd">Shift</span>+<span class="kbd">/</span> (or <span class="kbd">?</span>) — open this tour; <span class="kbd">Ctrl</span>/<span class="kbd">⌘</span> + <span class="kbd">,</span> — toggle compact mode; <span class="kbd">Ctrl</span>/<span class="kbd">⌘</span> + <span class="kbd">M</span> — open Messages.' }
      ];
      let idx = 0;
      const ov = document.createElement('div');
      ov.id = 'demoTourOverlay';
      ov.style = 'position:fixed;inset:0;background:rgba(2,6,23,0.75);display:flex;align-items:center;justify-content:center;z-index:14000;';
  const box = document.createElement('div');
  // responsive width: clamp between 320px and 720px, using viewport width as preferred
  box.style = 'max-width:720px;width:clamp(320px,92vw,720px);background:var(--surface);padding:18px;border-radius:12px;border:1px solid rgba(255,255,255,0.06);color:#fff;box-shadow:var(--shadow-1);';
      const title = document.createElement('h3'); title.style = 'margin:0 0 8px 0;padding:0;font-size:20px;';
      const body = document.createElement('div'); body.style = 'color:var(--muted);margin-bottom:12px;';
      const controls = document.createElement('div'); controls.style = 'display:flex;gap:8px;justify-content:flex-end;';
      const next = document.createElement('button'); next.className = 'btn btn-gradient'; next.textContent = 'Next';
      const close = document.createElement('button'); close.className = 'btn btn-outline'; close.textContent = 'Close';
      controls.appendChild(close); controls.appendChild(next);
      box.appendChild(title); box.appendChild(body); box.appendChild(controls); ov.appendChild(box); document.body.appendChild(ov);
      function render() {
        title.textContent = steps[idx].title;
        // support steps that provide HTML (for keyboard tokens) or plain text
        if (steps[idx].html) {
          body.innerHTML = steps[idx].html;
        } else {
          body.textContent = steps[idx].text;
        }
        next.textContent = idx === steps.length - 1 ? 'Done' : 'Next';
      }
      next.addEventListener('click', () => {
        idx++;
        if (idx >= steps.length) { ov.remove(); try { localStorage.setItem('seenDemoTour', '1'); } catch (err) { /* ignore */ } return; }
        render();
      });
      close.addEventListener('click', () => { ov.remove(); });
      render();
    } catch (err) { console.error('showDashboardTour failed', err); }
  }

})();

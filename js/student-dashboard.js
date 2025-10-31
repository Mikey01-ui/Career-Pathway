  // Directly use demo data from window.demoAccounts
  function renderAllStudents(){
    const students = (window.demoAccounts || []).filter(u => u.type === 'student');
    const list = qs('#allStudentsList');
    if(!list) return;
    list.innerHTML = '';
      students.forEach(s => {
        const card = document.createElement('div');
        card.className = 'student-card';
        card.style = 'background:var(--surface);border-radius:16px;padding:18px;box-shadow:var(--shadow-1);display:flex;gap:18px;align-items:center;';
        // Avatar sticker
        const avatar = document.createElement('div');
        avatar.className = 'avatar';
  // responsive avatar: scales between 40px and 56px based on viewport
  avatar.style = `width:clamp(40px,6.5vw,56px);height:clamp(40px,6.5vw,56px);border-radius:50%;background:${s.avatarColor};display:flex;align-items:center;justify-content:center;font-size:1.7em;color:#fff;font-weight:700;flex-shrink:0;`;
        avatar.textContent = s.name.split(' ')[0][0];
        const info = document.createElement('div');
        info.style = 'flex:1;';
        info.innerHTML = `
          <div style="font-size:1.15em;font-weight:600;">${s.name}</div>
          <div class="muted" style="margin-bottom:6px;">${s.email}</div>
          <div><span class="badge">${s.education}</span> <span class="badge">${s.location}</span> <span class="badge">Visa: ${s.visa}</span></div>
          <div style="margin:6px 0 2px 0;"><strong>Skills:</strong> ${(s.skills||[]).map(sk=>`<span class='badge'>${sk}</span>`).join(' ')}</div>
          <div style="margin-bottom:4px;"><strong>About:</strong> <span class="muted">${s.summary||'—'}</span></div>
        `;
        card.appendChild(avatar);
        card.appendChild(info);
        list.appendChild(card);
      });
  }
// Student dashboard logic: profile, stats, jobs, applications
(function(){
  const { formatDate, showNotification } = window.dashboardUtils || {};
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));

  // small helper to render relative times (e.g. "2h ago")
  function timeAgo(ts){
    try{
      const d = Date.now() - (ts || 0);
      const sec = Math.floor(d/1000);
      if(sec < 60) return `${sec}s ago`;
      const min = Math.floor(sec/60);
      if(min < 60) return `${min}m ago`;
      const hr = Math.floor(min/60);
      if(hr < 24) return `${hr}h ago`;
      const days = Math.floor(hr/24);
      return `${days}d ago`;
    }catch(e){ return new Date(ts).toLocaleString(); }
  }

  async function loadProfile(){
    const p = await apiRequest('/api/students/profile');
  // Render profile picture (inject image before name)
  // Always set profile photo src
  try{
    const img = qs('#profilePhoto');
    // prefer profile photo from API, otherwise fall back to the persisted demo user photo
    const fallbackPhoto = (window.currentUser && window.currentUser.photo) || '';
    if(img) { img.src = p.photo || fallbackPhoto || ''; img.alt = p.name || 'Profile'; }
  }catch(e){}
// --- Demo messaging platform ---
function setupMessages(){
  const messagesList = document.getElementById('messagesList');
  const messageForm = document.getElementById('messageForm');
  const messageInput = document.getElementById('messageInput');
  const user = window.currentUser || null;
  const conversationEmail = (user && user.email) || 'student';
  const key = 'demoMessages_' + conversationEmail;

  function getAvatarByName(name){
    try{ const acct = (window.demoAccounts||[]).find(a=> a.name === name || a.email === name); if(acct) return acct.photo || acct.avatarColor || ''; }catch{} return '';
  }
  
  // Seed demo messages helper (exposed so users can populate if empty)
  function seedDemoMessagesFor(email){
    try{
      if(!email) return;
      const key = 'demoMessages_' + email;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      if(existing && existing.length>0) return;
      const employers = (window.demoAccounts||[]).filter(a=> a.type === 'employer');
      if(!employers || employers.length===0) return;
      const user = window.currentUser || { name: 'Student' };
      const now = Date.now();
      const samples = [];
      for(let i=0;i<Math.min(3, employers.length); i++){
        const e = employers[i];
        samples.push({ from: e.name, text: `Hi ${user.name.split(' ')[0]}, we saw your profile and think you'd be a great fit for a ${['Data Analyst','ML Engineer','Product Analyst'][i%3]} role.`, at: now - ((i+1)*86400*1000) });
      }
      samples.push({ from: user.name, text: `Thanks — I'm interested! Happy to chat.`, at: now - 3600*1000 });
      localStorage.setItem(key, JSON.stringify(samples));
    }catch(e){ console.error('seedDemoMessagesFor failed', e); }
  }

  // More robust seeding: populate the current student's inbox with messages from all demo employers
  function seedEmployersMessagesForCurrentUser(){
    try{
      const user = window.currentUser; if(!user || !user.email) return;
      const key = 'demoMessages_' + user.email;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      if(existing && existing.length>0) return; // don't overwrite
      const employers = (window.demoAccounts||[]).filter(a=> a.type === 'employer');
      if(!employers || employers.length===0) return;
      const now = Date.now(); const samples = [];
      employers.forEach((e,i)=>{
        samples.push({ from: e.name, text: `Hi ${user.name.split(' ')[0]}, ${e.company} is hiring for roles like ${['Data Analyst','ML Engineer','Product Analyst'][i%3]}. Interested?`, at: now - ((i+1)*3600*1000) });
      });
      // add a short reply from student to make conversation look natural
      samples.push({ from: user.name, text: `Thanks — I'm interested. Happy to chat about opportunities.`, at: now - 1800*1000 });
      localStorage.setItem(key, JSON.stringify(samples));
      return true;
    }catch(e){ console.error('seedEmployersMessagesForCurrentUser failed', e); return false; }
  }

  // Insert a small control bar for demo actions (simulate incoming message)
  try{
    if(messagesList){
      const ctrl = document.createElement('div');
      ctrl.style = 'display:flex;gap:8px;align-items:center;margin-bottom:8px;';
      const sim = document.createElement('button'); sim.className='btn btn-outline'; sim.textContent='Simulate incoming';
      sim.onclick = ()=>{
        try{
          const key = 'demoMessages_' + conversationEmail;
          let msgs = JSON.parse(localStorage.getItem(key) || '[]');
          const employers = (window.demoAccounts||[]).filter(a=> a.type === 'employer');
          const from = (employers && employers[0] && employers[0].name) || 'Employer';
          msgs.push({ from, text: '(simulated) Hi — this is a demo message.', at: Date.now() });
          localStorage.setItem(key, JSON.stringify(msgs));
          showNotification && showNotification('Simulated incoming message', 'info');
        }catch(e){ console.error('simulate incoming failed', e); }
      };
      const simOut = document.createElement('button'); simOut.className='btn btn-outline'; simOut.textContent='Simulate outgoing';
      simOut.onclick = ()=>{
        try{
          const key = 'demoMessages_' + conversationEmail;
          let msgs = JSON.parse(localStorage.getItem(key) || '[]');
          const me = (window.currentUser && window.currentUser.name) || 'You';
          msgs.push({ from: me, text: '(simulated) This is a demo reply.', at: Date.now() });
          localStorage.setItem(key, JSON.stringify(msgs));
          showNotification && showNotification('Simulated outgoing message', 'success');
        }catch(e){ console.error('simulate outgoing failed', e); }
      };
      ctrl.appendChild(sim); ctrl.appendChild(simOut);
      // Add a convenience button to populate messages from demo employers (student view)
      const populateBtn = document.createElement('button'); populateBtn.className='btn btn-gradient'; populateBtn.textContent = 'Populate from employers';
      populateBtn.onclick = ()=>{
        try{
          const ok = seedEmployersMessagesForCurrentUser();
          if(ok){ loadMessages(); updateMessagesBadge(); showNotification && showNotification('Populated messages from demo employers', 'info'); }
          else { showNotification && showNotification('Nothing to populate (already present or no demo employers)', 'info'); }
        }catch(e){ console.error(e); showNotification && showNotification('Populate failed', 'error'); }
      };
      ctrl.appendChild(populateBtn);
      messagesList.parentNode.insertBefore(ctrl, messagesList);
    }
  }catch(e){}

  function lastReadKey(convoEmail, viewerEmail){ return `demoLastRead_${convoEmail}|${viewerEmail}`; }
  function getLastRead(convoEmail, viewerEmail){ try{ return parseInt(localStorage.getItem(lastReadKey(convoEmail, viewerEmail))||'0',10); }catch{return 0;} }
  function setLastRead(convoEmail, viewerEmail, ts){ try{ localStorage.setItem(lastReadKey(convoEmail, viewerEmail), String(ts)); }catch{} }

  function loadMessages(){
    let msgs = [];
    try{ msgs = JSON.parse(localStorage.getItem(key)||'[]'); }catch{}
    messagesList.innerHTML = '';
    const me = (window.currentUser && window.currentUser.name) || '';
    const viewerEmail = (window.currentUser && window.currentUser.email) || '';
    const last = getLastRead(conversationEmail, viewerEmail) || 0;
    // If no messages, try seeding automatically so the demo looks active, otherwise show a small placeholder
    if((!msgs || msgs.length===0) && typeof seedDemoMessagesFor === 'function'){
      // attempt automatic seeding once
      try{ seedDemoMessagesFor(conversationEmail); msgs = JSON.parse(localStorage.getItem(key) || '[]'); }catch(e){}
      // still empty? show placeholder and provide manual populate action
      if(!msgs || msgs.length===0){
        const placeholder = document.createElement('div'); placeholder.className='card';
        placeholder.style = 'padding:14px;border-radius:10px;background:rgba(255,255,255,.02);';
        placeholder.innerHTML = `<div style="margin-bottom:8px;">No messages yet in this conversation.</div>`;
        const btn = document.createElement('button'); btn.className='btn btn-outline'; btn.textContent='Populate demo messages';
        btn.onclick = ()=>{ seedDemoMessagesFor(conversationEmail); loadMessages(); updateMessagesBadge(); };
        placeholder.appendChild(btn);
        messagesList.appendChild(placeholder);
        return;
      }
    }
    msgs.forEach(m=>{
      const isMine = m.from === me;
      const wrapper = document.createElement('div');
      wrapper.style = `display:flex;gap:10px;margin-bottom:8px;justify-content:${isMine? 'flex-end':'flex-start'};`;
      const avatarSrc = getAvatarByName(m.from);
      const bubble = document.createElement('div');
      bubble.className = 'msg-bubble ' + (isMine? 'mine':'their');
  bubble.style = `max-width:72%;padding:10px 12px;border-radius:12px;position:relative;`;
  bubble.innerHTML = `<div class="sender" style="font-size:13px;margin-bottom:6px;"><strong style="font-weight:600;">${m.from}</strong></div><div class="body">${m.text}</div><div class="muted timestamp" data-ts="${m.at}" style="font-size:11px;margin-top:6px;">${timeAgo(m.at)}</div>`;
            if(isMine){
              wrapper.appendChild(bubble);
              if(avatarSrc){ const img=document.createElement('img'); img.src=avatarSrc; img.style='width:clamp(28px,6vw,36px);height:clamp(28px,6vw,36px);border-radius:8px;object-fit:cover;'; wrapper.appendChild(img); }
              // For messages sent by the student, show 'Seen' if any employer has read this message (demo heuristic)
              try{
                const employers = (window.demoAccounts||[]).filter(a=> a.type === 'employer');
                const messageAt = m.at || 0;
                let seenByAny = false; let seenCount = 0;
                employers.forEach(emp => {
                  try{
                    const lr = getLastRead(conversationEmail, emp.email) || 0;
                    if(lr >= messageAt) { seenByAny = true; seenCount++; }
                  }catch(e){}
                });
                if(seenByAny){ const seenTag = document.createElement('span'); seenTag.className='msg-seen'; seenTag.textContent = seenCount>1? `Seen by ${seenCount}` : 'Seen'; bubble.appendChild(seenTag); }
                else { const del = document.createElement('span'); del.className='msg-delivered'; del.textContent = 'Delivered'; bubble.appendChild(del); }
              }catch(e){}
            } else { if(avatarSrc){ const img=document.createElement('img'); img.src=avatarSrc; img.style='width:clamp(28px,6vw,36px);height:clamp(28px,6vw,36px);border-radius:8px;object-fit:cover;'; wrapper.appendChild(img); } wrapper.appendChild(bubble); }
      messagesList.appendChild(wrapper);
    });
  // apply relative-time tooltips (surprise) then smooth scroll to bottom
  try{ if(window.dashboardUtils && window.dashboardUtils.applyTimestampTooltips) window.dashboardUtils.applyTimestampTooltips(messagesList); }catch(e){}
  try{ messagesList.scrollTo({ top: messagesList.scrollHeight, behavior: 'smooth' }); }catch(e){ messagesList.scrollTop = messagesList.scrollHeight; }
  // focus input for quick replies
  try{ if(messageInput) messageInput.focus({ preventScroll: true }); }catch(e){}
    // mark conversation as read now that it's rendered
    try{ setLastRead(conversationEmail, (window.currentUser && window.currentUser.email) || '', Date.now()); }catch(e){}
    // update unread badge after rendering
    updateMessagesBadge();
  }

  function updateMessagesBadge(){
    try{
      const badge = document.getElementById('navMessagesBadge'); if(!badge) return;
      let msgs = [];
      try{ msgs = JSON.parse(localStorage.getItem(key)||'[]'); }catch{}
      const me = (window.currentUser && window.currentUser.name) || '';
      const viewerEmail = (window.currentUser && window.currentUser.email) || '';
      const last = getLastRead(conversationEmail, viewerEmail) || 0;
      const unread = msgs.filter(m => m.from !== me && m.at > last).length;
      if(unread > 0){ badge.style.display = 'inline-block'; badge.textContent = unread>99? '99+' : String(unread); }
      else { badge.style.display = 'none'; }
    }catch(e){}
  }

  messageForm.addEventListener('submit', e=>{
    e.preventDefault();
    const text = messageInput.value.trim(); if(!text) return;
    let msgs = [];
    try{ msgs = JSON.parse(localStorage.getItem(key)||'[]'); }catch{}
    const sender = (window.currentUser && window.currentUser.name) || 'Student';
    msgs.push({ from: sender, text, at: Date.now() });
    localStorage.setItem(key, JSON.stringify(msgs));
    messageInput.value = '';
    loadMessages();
    updateMessagesBadge();
  });

  // Keyboard shortcut: Ctrl/Cmd + Enter to submit message
  try{
    if(messageInput){
      messageInput.addEventListener('keydown', (ev)=>{
        if((ev.ctrlKey || ev.metaKey) && ev.key === 'Enter'){
          ev.preventDefault();
          messageForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      });
    }
  }catch(e){}

  // Export conversation as plain text
  try{
    const exportBtn = document.getElementById('exportConversation');
    if(exportBtn){
      exportBtn.addEventListener('click', ()=>{
        try{
          const msgs = JSON.parse(localStorage.getItem(key) || '[]') || [];
          const lines = msgs.map(m => `${new Date(m.at).toLocaleString()} — ${m.from}: ${m.text}`);
          const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `${(window.currentUser && window.currentUser.email)||'conversation'}.txt`;
          document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
          showNotification && showNotification('Conversation exported', 'info');
        }catch(err){ console.error('export failed', err); showNotification && showNotification('Export failed', 'error'); }
      });
    }
  }catch(e){}

  loadMessages();
  // Listen for storage events so messages sync across tabs/windows
  window.addEventListener('storage', (ev) => {
    if(!ev.key) return;
    // If the messages for this conversation change, reload and flash if it's an incoming message
    if(ev.key === key){
      try{
        // determine latest message and whether it's incoming
        const msgs = JSON.parse(localStorage.getItem(key) || '[]');
        const last = msgs && msgs.length ? msgs[msgs.length-1] : null;
        const me = (window.currentUser && window.currentUser.name) || '';
        loadMessages();
        if(last && last.from !== me){
          const items = messagesList.children; if(items && items.length){ const el = items[items.length-1]; el.classList.add('msg-incoming'); setTimeout(()=> el.classList.remove('msg-incoming'), 900); }
        }
      }catch(e){ loadMessages(); }
    }
    if(ev.key && ev.key.startsWith('demoLastRead_')){ loadMessages(); }
  });
}
  qs('#profileName').textContent = p.name;
  qs('#profileEdu').textContent = p.education + (p.location ? `, ${p.location}` : '');
  qs('#profileVisa').textContent = p.visa;
  qs('#profileSkills').textContent = (p.skills||[]).join(', ');
  // Populate top skill stat if present
  try{ const topEl = qs('#statTopSkill'); if(topEl) topEl.textContent = (p.skills && p.skills.length>0) ? p.skills[0] : '—'; }catch(e){}
  let extra = '';
  if(p.languages) extra += `\nLanguages: ${p.languages.join(', ')}`;
  if(p.awards) extra += `\nAwards: ${p.awards.join(', ')}`;
  if(p.interests) extra += `\nInterests: ${p.interests.join(', ')}`;
  if(p.github) extra += `\nGitHub: ${p.github}`;
  if(p.linkedin) extra += `\nLinkedIn: ${p.linkedin}`;
  qs('#profileSummary').textContent = (p.summary ? p.summary : '') + extra;
    // Enable CV download
    const cvBtn = qs('button[download-cv]');
    if(cvBtn){
      cvBtn.disabled = false;
      cvBtn.onclick = async function(){
        try{
          cvBtn.disabled = true; cvBtn.textContent = 'Generating PDF...';
          showSpinner('Generating PDF...');
          // build a printable CV element
          const cv = document.createElement('div');
          cv.id = 'cvExport';
          // make printable CV container responsive when previewed in-browser (PDF export still uses same element)
          Object.assign(cv.style, { width:'min(800px, 92vw)', padding:'28px', background:'#ffffff', color:'#111', fontFamily:'Inter, Arial, sans-serif' });
          cv.innerHTML = `
            <div style="display:flex;gap:18px;align-items:center;margin-bottom:14px;">
              <div style="width:clamp(72px,16vw,100px);height:clamp(72px,16vw,100px);flex-shrink:0;">
                <img src="${p.photo||''}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;"/>
              </div>
              <div>
                <h1 style="margin:0;font-size:22px;">${p.name}</h1>
                <div style="color:#555;margin-top:6px;">${p.education || ''}${p.location? (' • '+p.location): ''}</div>
              </div>
            </div>
            <section style="margin-top:8px;">
              <h3 style="margin:0 0 6px 0;">Summary</h3>
              <div style="color:#333;line-height:1.4;">${(p.summary||'').replace(/\n/g,'<br/>')}</div>
            </section>
            <section style="margin-top:12px;display:flex;gap:24px;">
              <div style="flex:1;">
                <h4 style="margin:6px 0;">Skills</h4>
                <div>${(p.skills||[]).map(s=>`<span style=\"display:inline-block;background:#eef; padding:4px 8px;border-radius:8px;margin:4px;font-size:12px;color:#113\">${s}</span>`).join('')}</div>
              </div>
              <div style="width:min(220px,34vw);">
                <h4 style="margin:6px 0;">Details</h4>
                <div style="color:#333;line-height:1.6;">
                  <div><strong>Visa:</strong> ${p.visa||'—'}</div>
                  <div><strong>Languages:</strong> ${(p.languages||[]).join(', ')}</div>
                  <div><strong>Awards:</strong> ${(p.awards||[]).join(', ')}</div>
                </div>
              </div>
            </section>
          `;
          document.body.appendChild(cv);
          // render with html2canvas and export with jsPDF
          const canvas = await window.html2canvas(cv, { scale:2 });
          const imgData = canvas.toDataURL('image/png');
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ unit:'mm', format:'a4' });
          const pageWidth = pdf.internal.pageSize.getWidth();
          const margin = 10;
          const imgProps = pdf.getImageProperties(imgData);
          const pdfWidth = pageWidth - margin*2;
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'PNG', margin, 10, pdfWidth, pdfHeight);
          pdf.save(`${p.name.replace(/\s+/g,'_')}_CV.pdf`);
          cv.remove();
        }catch(err){ console.error(err); alert('Failed to generate PDF.'); }
        finally{ hideSpinner(); cvBtn.disabled = false; cvBtn.textContent = 'Download CV'; }
      };
    }
  }

  async function loadStats(){
    const s = await apiRequest('/api/students/statistics');
    qs('#statViews').textContent = s.views;
    qs('#statMatches').textContent = s.matches;
    qs('#statInterviews').textContent = s.interviews;
    const appEl = qs('#statApplications'); if(appEl) appEl.textContent = s.applications;
    const compEl = qs('#statCompleteness'); if(compEl) compEl.textContent = (s.profileCompleteness ? s.profileCompleteness + '%' : '—');
    const msgEl = qs('#statMessages'); if(msgEl) msgEl.textContent = (s.messages!=null ? s.messages : '—');
    // Render overview chart using a small synthetic timeseries based on views
    try{ renderOverviewChart(s); }catch(e){}
  }

  // Small helper to create a synthetic 7-day series around a base value
  function makeSeries(base, len=7){
    const arr = [];
    for(let i=0;i<len;i++){
      const jitter = Math.floor((Math.random()-0.5) * (base * 0.18));
      arr.push(Math.max(0, Math.round(base/len + jitter + (i*2))));
    }
    return arr;
  }

  let _overviewChart = null;
  function renderOverviewChart(stats){
    // Render a doughnut chart summarizing activity: views, matches, applications, interviews
    const canvas = qs('#overviewChart');
    if(!canvas || !window.Chart) return;
    const views = Math.max(0, stats.views || 0);
    const matches = Math.max(0, stats.matches || 0);
    const applications = Math.max(0, stats.applications || 0);
    const interviews = Math.max(0, stats.interviews || 0);
    const dataVals = [views, matches, applications, interviews];
    const labels = ['Views','Matches','Applications','Interviews'];
    const colors = ['#7c3aed','#10b981','#22d3ee','#f59e42'];
    if(_overviewChart) { _overviewChart.destroy(); _overviewChart = null; }
    _overviewChart = new Chart(canvas.getContext('2d'), {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: dataVals, backgroundColor: colors, borderColor: '#0b0b0b', borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '55%',
        plugins: {
          legend: { display: true, position: 'bottom', labels: { color: '#ddd' } },
          tooltip: { enabled: true }
        }
      }
    });
    // If all zeros, display muted message instead of chart
    if(dataVals.every(v=>v===0)){
      const ctx = canvas.getContext('2d'); ctx.clearRect(0,0,canvas.width,canvas.height);
      const tx = canvas.parentNode.querySelector('.muted'); if(tx) tx.textContent = 'No activity yet';
    }
  }

  // Spinner overlay for PDF generation
  function ensureSpinnerStyles(){
    if(document.getElementById('pdfSpinnerStyles')) return;
    const style = document.createElement('style'); style.id = 'pdfSpinnerStyles';
    style.textContent = `
      #pdfSpinnerOverlay{position:fixed;inset:0;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:12000}
  .pdf-spinner{width:clamp(40px,8vw,64px);height:clamp(40px,8vw,64px);border-radius:50%;border:clamp(4px,0.8vw,6px) solid rgba(255,255,255,0.12);border-top-color:#7c3aed;animation:spin 1s linear infinite}
      @keyframes spin{to{transform:rotate(360deg)}}
      #pdfSpinnerText{color:#fff;margin-top:12px;font-family:Inter,Arial,Helvetica,sans-serif}
    `;
    document.head.appendChild(style);
  }

  function showSpinner(text){
    ensureSpinnerStyles();
    if(document.getElementById('pdfSpinnerOverlay')) return;
    const overlay = document.createElement('div'); overlay.id = 'pdfSpinnerOverlay';
    const box = document.createElement('div'); box.style = 'display:flex;flex-direction:column;align-items:center;gap:10px;padding:18px;border-radius:10px;';
    const spinner = document.createElement('div'); spinner.className = 'pdf-spinner';
    const t = document.createElement('div'); t.id = 'pdfSpinnerText'; t.textContent = text || 'Preparing PDF...';
    box.appendChild(spinner); box.appendChild(t); overlay.appendChild(box); document.body.appendChild(overlay);
  }

  function hideSpinner(){ const o = document.getElementById('pdfSpinnerOverlay'); if(o) o.remove(); }

  function renderJob(job){
    const li = document.createElement('li'); li.className = 'job-card';
    li.innerHTML = `
      <h4>${job.title} — <span class="muted">${job.company}</span></h4>
      <div class="job-meta">${job.location} • ${job.type} • ${job.posted} • ${job.salary||''}</div>
      <div>${(job.tags||[]).map(t=>`<span class="badge">${t}</span>`).join(' ')}</div>
      <div class="job-actions"><button class="btn btn-small btn-gradient" data-apply="${job.id}">Apply</button>
      <button class="btn btn-small btn-outline" data-view="${job.id}">Details</button></div>
    `;
    return li;
  }

  async function loadJobs(){
    const jobs = await apiRequest('/api/jobs');
    const list = qs('#jobsList'); list.innerHTML='';
    jobs.forEach(j=> list.appendChild(renderJob(j)));
    list.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if(!btn) return;
      if(btn.hasAttribute('data-apply')){
        showNotification('Application submitted (demo).', 'success');
      }
      if(btn.hasAttribute('data-view')){
        showNotification('Opening details (demo).', 'info');
      }
    });
  }

  async function loadApplications(){
    const apps = await apiRequest('/api/students/applications');
    const list = qs('#appsList'); list.innerHTML = '';
    apps.forEach(a=>{
      const item = document.createElement('div'); item.className = 'list-item';
      item.innerHTML = `
        <div>
          <div><strong>${a.job}</strong> — <span class="muted">${a.company}</span></div>
          <div class="muted">Applied ${formatDate(a.appliedAt)}</div>
        </div>
        <div><span class="badge">${a.status}</span></div>
      `;
      list.appendChild(item);
    });
  }

  document.addEventListener('DOMContentLoaded', async ()=>{
    document.body.classList.add('dashboard');
    const common = new DashboardCommon();
    await common.init();
    if(!common.user) return;
    // Load data for default sections
    loadProfile();
    loadStats();
    loadJobs();
    loadApplications();
    renderAllStudents();
    // Seed some demo messages from employers if the conversation is empty (so the demo looks active)
    (function seedDemoMessages(){
      try{
        const user = window.currentUser; if(!user || !user.email) return;
        const key = 'demoMessages_' + user.email;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        if(existing && existing.length>0) return; // don't overwrite if messages exist
        const employers = (window.demoAccounts||[]).filter(a=> a.type === 'employer');
        if(!employers || employers.length===0) return;
        const now = Date.now();
        const samples = [];
        // pick up to 3 employers and craft short demo messages
        for(let i=0;i<Math.min(3, employers.length); i++){
          const e = employers[i];
          samples.push({ from: e.name, text: `Hi ${user.name.split(' ')[0]}, we saw your profile and think you'd be a great fit for a ${['Data Analyst','ML Engineer','Product Analyst'][i%3]} role.`, at: now - ((i+1)*86400*1000) });
        }
        // add a quick follow-up from student to simulate reply
        samples.push({ from: user.name, text: `Thanks — I'm interested! Happy to chat.`, at: now - 3600*1000 });
        localStorage.setItem(key, JSON.stringify(samples));
      }catch(e){}
    })();
    setupMessages();
  });
})();

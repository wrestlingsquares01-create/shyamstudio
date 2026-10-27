/*
  THE STUDIO — shared frontend controller
  Version: 2.1, simple 5-name community entry.
  SECURITY: Name routing is NOT authentication. Real orders, admin login,
  private messages and members MUST use Supabase Auth + RLS before launch.
  No actual customer enquiry is sent by this version.
*/
(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const page = document.body.dataset.page || '';
  const safeStore = {
    get(key, fallback = '') { try { return sessionStorage.getItem(key) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch {} },
    remove(key) { try { sessionStorage.removeItem(key); } catch {} }
  };
  const escapeTime = () => new Date().toLocaleTimeString(undefined, {hour:'2-digit', minute:'2-digit'});
  let toastTimeout;
  function toast(message) {
    const el = $('siteToast'); if (!el) return;
    el.textContent = message; el.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => { el.hidden = true; }, 3900);
  }
  function initGlobal() {
    document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });
    const light = $('pointerLight');
    if (light && matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      window.addEventListener('pointermove', e => { light.style.left = `${e.clientX}px`; light.style.top = `${e.clientY}px`; light.classList.add('active'); }, {passive:true});
      document.addEventListener('mouseleave', () => light.classList.remove('active'));
    }
    const reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      const observer = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } }, {threshold:.08});
      reveals.forEach(el => observer.observe(el));
    } else reveals.forEach(el => el.classList.add('visible'));
    if (matchMedia('(pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
      document.querySelectorAll('[data-tilt]').forEach(el => {
        let raf;
        el.addEventListener('pointermove', event => {
          if (raf) cancelAnimationFrame(raf);
          raf = requestAnimationFrame(() => {
            const r = el.getBoundingClientRect();
            const x = (event.clientX - r.left) / r.width - .5;
            const y = (event.clientY - r.top) / r.height - .5;
            el.style.setProperty('--tilt-x', `${(-y * 3).toFixed(2)}deg`);
            el.style.setProperty('--tilt-y', `${(x * 3).toFixed(2)}deg`);
            // Slightly rotate artwork, without moving the interactive card itself.
            const img = el.querySelector('.sculpture-art,.portfolio-art img');
            if (img) img.style.rotate = `${(x * 5).toFixed(2)}deg`;
          });
        });
        el.addEventListener('pointerleave', () => {
          if (raf) cancelAnimationFrame(raf);
          el.style.removeProperty('--tilt-x'); el.style.removeProperty('--tilt-y');
          const img = el.querySelector('.sculpture-art,.portfolio-art img'); if (img) img.style.rotate = '';
        });
      });
    }
  }
  const cfg = window.STUDIO_CONFIG || {};
  const ready = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test((cfg.url || '').trim())
    && /^(sb_publishable_|eyJ)/.test((cfg.publishableKey || '').trim());
  const db = ready && window.supabase?.createClient ? window.supabase.createClient(cfg.url.trim(), cfg.publishableKey.trim()) : null;
  function requireBackend(node) {
    if (db) return true;
    if (node) node.textContent = 'Supabase not configured. Fill config.js with your Project URL and publishable key.';
    toast('Connect Supabase using config.js first.');
    return false;
  }
  function errorText(error) {
    if (!error) return 'Unknown error';
    if (/permission denied|row.level.security|42501/i.test(error.message || '')) return 'Permission denied. Check account membership, admin role and SQL security policies.';
    return error.message || 'Request failed';
  }
  function textNode(tag, value, className='') {
    const el=document.createElement(tag); if (className) el.className=className; el.textContent=String(value ?? ''); return el;
  }
  function initEntry() {
    const form = $('entryForm'); if (!form) return;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const value = ($('entryName')?.value || '').trim().replace(/\s+/g, ' ');
      const message = $('entryMessage');
      if (value.length < 2) { message.textContent = 'Please enter at least 2 characters.'; $('entryName').focus(); return; }
      if (value.length > 60) { message.textContent = 'Name must be 60 characters or fewer.'; return; }
      const normalized = value.toLocaleLowerCase('en-IN');
      message.textContent = '';
      // These are navigation shortcuts, NOT access controls.
      if (normalized === 'admin') {
        safeStore.set('studio.intent', 'admin');
        location.assign('admin.html');
      } else if (normalized === 'bachyo') {
        safeStore.set('studio.intent', 'community');
        safeStore.set('studio.inviteCode', 'bachyo');
        location.assign('community.html');
      } else {
        safeStore.set('studio.guestName', value);
        location.assign('portfolio.html');
      }
    });
  }
  function fileDownload(text, name) {
    const blob = new Blob([text], {type:'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function initPortfolio() {
    const name=safeStore.get('studio.guestName','');
    if(name && $('visitorGreeting')) $('visitorGreeting').textContent=`WELCOME, ${name.toLocaleUpperCase('en-IN')}.`;
    if(name && $('orderName')) $('orderName').value=name;
    const toggle=$('navToggle'),menu=$('mobileNav');
    if(toggle&&menu){
      const setOpen=open=>{menu.hidden=!open;toggle.setAttribute('aria-expanded',String(open));};
      toggle.addEventListener('click',()=>setOpen(menu.hidden));
      menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
      document.addEventListener('keydown',e=>{if(e.key==='Escape')setOpen(false);});
    }
    const form=$('orderForm');if(!form)return;
    const feedback=$('orderFeedback'),submit=$('orderSubmit');
    function values(){
      if(!form.reportValidity())return null;
      const d={customer_name:$('orderName').value.trim(),contact_email:$('orderEmail').value.trim(),website_type:$('orderType').value,budget:$('orderBudget').value,requirements:$('orderDetails').value.trim()};
      if(d.customer_name.length<2||d.customer_name.length>100||d.requirements.length<10||d.requirements.length>4000||!d.website_type){feedback.textContent='Please complete all required fields (at least 10 characters in details).';return null;}
      return d;
    }
    $('downloadDraft')?.addEventListener('click',()=>{
      const d=values();if(!d)return;
      const body=['THE STUDIO — ENQUIRY DRAFT','NOT SUBMITTED',...Object.entries(d).map(([k,v])=>`${k}: ${v}`)].join('\n');
      fileDownload(body,'studio-enquiry-draft.txt');
      feedback.textContent='Draft downloaded. It has not been submitted.';
    });
    form.addEventListener('submit',async e=>{
      e.preventDefault();const d=values();if(!d||!requireBackend(feedback))return;
      if(form.dataset.sending==='yes')return;
      form.dataset.sending='yes';submit.disabled=true;feedback.textContent='Sending your request…';
      try{
        const {error}=await db.from('studio_orders').insert(d);
        if(error)throw error;
        feedback.textContent='Enquiry received. This is a request for a quote, not a confirmed purchase.';
        form.reset();if(name)$('orderName').value=name;
        toast('Request sent to THE STUDIO.');
      }catch(err){feedback.textContent=`Could not send: ${errorText(err)}`;}
      finally{submit.disabled=false;form.dataset.sending='no';}
    });
  }
  function initAdmin(){
    const authScreen=$('adminAuthScreen'),dashboard=$('adminDashboard'),feedback=$('adminLoginFeedback'),login=$('adminLoginForm');
    const password=$('adminPassword'),email=$('adminEmail');
    let authorized=false;
    $('toggleAdminPassword')?.addEventListener('click',()=>{
      const reveal=password.type==='password';password.type=reveal?'text':'password';
      $('toggleAdminPassword').textContent=reveal?'HIDE':'SHOW';
    });
    function switchTab(tab){
      document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.adminTab===tab));
      document.querySelectorAll('.admin-panel').forEach(el=>el.classList.toggle('active',el.id===`adminTab-${tab}`));
      $('adminPageTitle').textContent=({overview:'Overview',orders:'Project requests',members:'Community',system:'System status'})[tab]||'Overview';
    }
    document.querySelectorAll('[data-admin-tab]').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.adminTab)));
    async function verifyUser(){
      const {data:{user},error}=await db.auth.getUser();if(error||!user)return false;
      const {data:admin,error:membershipError}=await db.from('studio_admins').select('user_id').eq('user_id',user.id).maybeSingle();
      if(membershipError||!admin)return false;
      return true;
    }
    async function loadOrders(){
      if(!authorized)return;
      const body=$('adminOrdersBody');body.replaceChildren();
      body.append(textNode('tr',''));body.firstChild.append(Object.assign(textNode('td','Loading…'),{colSpan:5}));
      const {data,error}=await db.from('studio_orders').select('id,customer_name,contact_email,website_type,budget,requirements,status,created_at').order('created_at',{ascending:false}).limit(200);
      body.replaceChildren();
      if(error){const r=document.createElement('tr'),c=textNode('td',errorText(error));c.colSpan=5;r.append(c);body.append(r);return;}
      const orders=data||[];
      const kpis=document.querySelectorAll('.admin-kpi strong');
      if(kpis[0])kpis[0].textContent=orders.filter(o=>o.status==='pending').length;
      if(kpis[1])kpis[1].textContent=orders.filter(o=>['accepted','in_progress','reviewing'].includes(o.status)).length;
      if(!orders.length){const r=document.createElement('tr'),c=textNode('td','No enquiries yet.');c.colSpan=5;r.append(c);body.append(r);return;}
      const choices=['pending','reviewing','accepted','in_progress','completed','rejected'];
      for(const item of orders){
        const tr=document.createElement('tr');
        const customer=document.createElement('td');customer.append(textNode('strong',item.customer_name),textNode('small',item.contact_email));
        const project=document.createElement('td');project.append(textNode('strong',item.website_type),textNode('p',item.requirements,'studio-order-details'));
        const budget=textNode('td',item.budget);
        const status=document.createElement('td'),select=document.createElement('select');select.className='live-order-select';select.setAttribute('aria-label',`Status of ${item.customer_name}'s enquiry`);
        for(const v of choices){const opt=document.createElement('option');opt.value=v;opt.textContent=v.replaceAll('_',' ');opt.selected=v===item.status;select.append(opt);}
        select.addEventListener('change',async()=>{
          const before=item.status;select.disabled=true;
          const {error:updateError}=await db.from('studio_orders').update({status:select.value}).eq('id',item.id);
          if(updateError){select.value=before;toast(`Update failed: ${errorText(updateError)}`);}else{item.status=select.value;toast('Order status updated.');}
          select.disabled=false;
        });status.append(select);
        const date=textNode('td',new Date(item.created_at).toLocaleDateString());
        tr.append(customer,project,budget,status,date);body.append(tr);
      }
    }
    async function showAdmin(){
      authorized=await verifyUser();
      if(!authorized){authScreen.hidden=false;dashboard.hidden=true;feedback.textContent='This account is not approved as administrator.';return;}
      authScreen.hidden=true;dashboard.hidden=false;switchTab('overview');
      const sys=document.querySelectorAll('#adminTab-system .system-rows strong');
      ['CONNECTED','VERIFIED','LIVE','MEMBER-ONLY'].forEach((t,i)=>{if(sys[i])sys[i].textContent=t;});
      document.querySelectorAll('.admin-sidebar .sidebar-caption').forEach(el=>el.textContent='STUDIO / LIVE CONTROL');
      await loadOrders();
      const {count}=await db.from('studio_members').select('user_id',{head:true,count:'exact'});
      const kpis=document.querySelectorAll('.admin-kpi strong');if(kpis[2])kpis[2].textContent=count??'—';
    }
    login?.addEventListener('submit',async e=>{
      e.preventDefault();if(!requireBackend(feedback))return;
      const btn=login.querySelector('[type=submit]');btn.disabled=true;feedback.textContent='Verifying…';
      try{
        const {error}=await db.auth.signInWithPassword({email:email.value.trim(),password:password.value});
        password.value='';if(error)throw error;
        await showAdmin();
      }catch(err){feedback.textContent=`Login failed: ${errorText(err)}`;}
      finally{btn.disabled=false;}
    });
    $('exitAdminPreview')?.addEventListener('click',async()=>{
      if(db)await db.auth.signOut();authorized=false;dashboard.hidden=true;authScreen.hidden=false;password.value='';
    });
    // A previous authenticated admin may have a persisted session.
    if(db) db.auth.getSession().then(({data})=>{if(data.session)showAdmin();});
    document.querySelector('[data-admin-tab="orders"]')?.addEventListener('click',()=>{if(authorized)loadOrders();});
  }
  function initCommunity(){
    const app=$('circleApp'),gate=$('communityGate'),feedback=$('communityAuthFeedback'),form=$('communityLoginForm');
    const feed=$('circleMessageFeed'),input=$('circleMessageInput');
    const titles={chat:['The conversation','LIVE / PRIVATE CHAT'],media:['The gallery','LOCAL MEDIA PREVIEW'],notes:['The notebook','LOCAL NOTES'],members:['The people','APPROVED MEMBERS']};
    let user=null,member=null,channel=null,messages=[];
    const localNotesKey='studio.localNotes.v2';
    function setTab(tab){
      if(!titles[tab])return;
      document.querySelectorAll('[data-circle-tab]').forEach(btn=>btn.classList.toggle('active',btn.dataset.circleTab===tab));
      document.querySelectorAll('.circle-view').forEach(el=>{const active=el.id===`circleView-${tab}`;el.classList.toggle('active',active);el.hidden=!active;});
      $('circleSectionHeading').textContent=titles[tab][0];$('circleSectionMeta').textContent=titles[tab][1];
      if(tab==='chat')requestAnimationFrame(()=>{feed.scrollTop=feed.scrollHeight;});
      if(tab==='members')loadMembers();
    }
    document.querySelectorAll('[data-circle-tab]').forEach(btn=>btn.addEventListener('click',()=>setTab(btn.dataset.circleTab)));
    function render(){
      feed.querySelectorAll('.chat-bubble').forEach(el=>el.remove());
      for(const m of messages){
        const article=document.createElement('article');article.className='chat-bubble';
        const sender=m.sender_id===user.id?'YOU':(memberNames[m.sender_id]||'MEMBER');
        article.append(textNode('small',sender),textNode('p',m.body),textNode('time',new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})));
        feed.append(article);
      }
      feed.scrollTop=feed.scrollHeight;
      filterMessages($('circleSearchInput').value);
    }
    const memberNames={};
    async function loadMembers(){
      if(!user)return;
      const {data,error}=await db.from('studio_members').select('user_id,display_name,active').eq('active',true).limit(100);
      if(error)return;
      const list=$('memberDirectory');list.replaceChildren();
      for(const m of data||[]){memberNames[m.user_id]=m.display_name;list.append(textNode('p',m.display_name));}
      if(!(data||[]).length)list.textContent='No approved members listed.';
      render();
    }
    async function loadMessages(){
      const {data,error}=await db.from('studio_messages').select('id,sender_id,body,created_at').order('created_at',{ascending:false}).limit(100);
      if(error){toast(`Unable to load messages: ${errorText(error)}`);return;}
      messages=(data||[]).reverse();render();
    }
    async function start(){
      const {data:{user:currentUser},error:userError}=await db.auth.getUser();if(userError||!currentUser){feedback.textContent='Please sign in.';return;}
      const {data:profile,error:memberError}=await db.from('studio_members').select('user_id,display_name,active').eq('user_id',currentUser.id).maybeSingle();
      if(memberError||!profile?.active){feedback.textContent='Your account has not been approved for this private community.';return;}
      user=currentUser;member=profile;gate.hidden=true;app.hidden=false;
      await loadMembers();await loadMessages();setTab('chat');
      if(channel)await db.removeChannel(channel);
      channel=db.channel('studio-messages-v1').on('postgres_changes',{event:'INSERT',schema:'public',table:'studio_messages'},payload=>{
        if(!payload.new||messages.some(m=>m.id===payload.new.id))return;
        messages.push(payload.new);messages=messages.slice(-100);render();
      }).subscribe(status=>{
        if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')toast('Chat connection interrupted. Reopen to refresh.');
      });
    }
    const permittedNames = new Map([
      ['ravi', 'Ravi'], ['nuks', 'Nuks'], ['priyanshu', 'Priyanshu'],
      ['shyam', 'Shyam'], ['prashant', 'Prashant']
    ]);
    async function submitName(name, button) {
      if (!requireBackend(feedback)) return;
      const memberName = permittedNames.get(name.trim().toLocaleLowerCase('en-IN'));
      if (!memberName) { feedback.textContent = 'Please enter Ravi, Nuks, Priyanshu, Shyam or Prashant.'; return; }
      const inviteCode = safeStore.get('studio.inviteCode', '');
      if (inviteCode !== 'bachyo') {
        feedback.textContent = 'First enter bachyo on the main website to open this room.';
        return;
      }
      if (button) button.disabled = true;
      feedback.textContent = 'Opening your space…';
      try {
        let {data:{session},error:sessionError} = await db.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          const {data, error} = await db.auth.signInAnonymously();
          if (error) throw error;
          session = data.session;
        }
        if (!session?.user) throw new Error('Could not start a session.');
        const {error:joinError} = await db.rpc('join_studio_circle', {
          p_name: memberName,
          p_code: inviteCode
        });
        if (joinError) throw joinError;
        safeStore.set('studio.circleName', memberName);
        await start();
      } catch (err) {
        feedback.textContent = `Unable to join: ${errorText(err)}`;
      } finally { if (button) button.disabled = false; }
    }
    form?.addEventListener('submit', async e => {
      e.preventDefault();
      await submitName($('communityMemberName').value, form.querySelector('[type=submit]'));
    });
    $('communityLogout')?.addEventListener('click',async()=>{
      if(channel)await db.removeChannel(channel);channel=null;
      await db.auth.signOut();app.hidden=true;gate.hidden=false;user=null;member=null;messages=[];
      safeStore.remove('studio.circleName');
    });
    $('circleComposer')?.addEventListener('submit',async e=>{
      e.preventDefault();if(!user||!member)return;
      const text=input.value.trim();if(!text||text.length>2000)return;
      const btn=e.currentTarget.querySelector('[type=submit]');btn.disabled=true;
      const {data,error}=await db.from('studio_messages').insert({sender_id:user.id,body:text}).select('id,sender_id,body,created_at').single();
      btn.disabled=false;
      if(error){toast(`Message not sent: ${errorText(error)}`);return;}
      input.value='';if(data&&!messages.some(m=>m.id===data.id)){messages.push(data);messages=messages.slice(-100);render();}
    });
    $('circleSearchToggle')?.addEventListener('click',()=>{setTab('chat');$('circleSearchRow').hidden=false;$('circleSearchInput').focus();});
    $('clearCircleSearch')?.addEventListener('click',()=>{$('circleSearchRow').hidden=true;$('circleSearchInput').value='';filterMessages('');});
    function filterMessages(term){
      const q=(term||'').trim().toLocaleLowerCase();
      feed.querySelectorAll('.chat-bubble').forEach(el=>el.classList.toggle('filtered-out',!!q&&!el.textContent.toLocaleLowerCase().includes(q)));
    }
    $('circleSearchInput')?.addEventListener('input',e=>filterMessages(e.target.value));
    $('circleAttachBtn')?.addEventListener('click',()=>toast('Media uploads need separately configured Supabase Storage and policies.'));
    const photoURLs=[];
    $('circlePhotos')?.addEventListener('change',e=>{
      let count=0;
      for(const file of Array.from(e.target.files||[]).slice(0,12)){
        if(!file.type.startsWith('image/')||file.size>8*1024*1024)continue;
        const url=URL.createObjectURL(file);photoURLs.push(url);
        const tile=document.createElement('div');tile.className='circle-photo-tile';const img=document.createElement('img');img.src=url;img.alt='Local preview (not uploaded)';tile.append(img);$('circlePhotoGrid').prepend(tile);count++;
      }
      toast(`${count} photo(s) previewed locally. Nothing uploaded.`);e.target.value='';
    });
    window.addEventListener('pagehide',()=>photoURLs.forEach(u=>URL.revokeObjectURL(u)));
    let notes=[];try{notes=JSON.parse(sessionStorage.getItem(localNotesKey)||'[]');if(!Array.isArray(notes))notes=[];}catch{notes=[];}
    function renderNotes(){
      const holder=$('circleNotesList');holder.replaceChildren();
      notes.forEach((n,i)=>{const article=document.createElement('article');article.className='circle-note';article.append(textNode('p',n));const del=document.createElement('button');del.type='button';del.textContent='Remove';del.addEventListener('click',()=>{notes.splice(i,1);sessionStorage.setItem(localNotesKey,JSON.stringify(notes));renderNotes();});article.append(del);holder.append(article);});
    }
    $('circleNotesForm')?.addEventListener('submit',e=>{e.preventDefault();const el=$('circleNoteInput');const n=el.value.trim();if(!n)return;notes.unshift(n);notes=notes.slice(0,30);sessionStorage.setItem(localNotesKey,JSON.stringify(notes));el.value='';renderNotes();});renderNotes();
    function adjust(){if(!app||window.innerWidth>600||!window.visualViewport)return;app.style.height=`${window.visualViewport.height}px`;app.style.transform=`translateY(${window.visualViewport.offsetTop}px)`;}
    window.visualViewport?.addEventListener('resize',adjust);window.visualViewport?.addEventListener('scroll',adjust);window.addEventListener('resize',()=>{if(window.innerWidth>600){app.style.height='';app.style.transform='';}else adjust();});
    if (db) {
      // Reuse a persisted anonymous session only after an earlier successful join.
      db.auth.getSession().then(async ({data}) => {
        if (!data.session || safeStore.get('studio.inviteCode') !== 'bachyo') return;
        if (safeStore.get('studio.circleName')) {
          await start();
        }
      });
    } else requireBackend(feedback);
  }
  document.addEventListener('DOMContentLoaded',()=>{
    initGlobal();
    if(page==='entry')initEntry();
    if(page==='portfolio')initPortfolio();
    if(page==='admin')initAdmin();
    if(page==='community')initCommunity();
  });
})();

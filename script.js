/* SHYAMWEB.STORE — LIVE ORDER PLATFORM (V4)
 * Keep the existing index.html unchanged.
 * Only replace the TWO safe PUBLIC values below.
 * NEVER paste a Supabase secret key or database password in this file.
 */
(() => {
  'use strict';
  const CONFIG = {
    // Put your real project URL and publishable key here (NEVER a secret/service-role key).
    supabaseUrl: 'https://imkxanmpxmkeowducxiw.supabase.co',
    publishableKey: 'sb_publishable_tpEsec45-BzwY4fMxCwmKg_g93sjfdE',
    turnstileSiteKey: '1x00000000000000000000AA' // TEST ONLY: replace with real sitekey before public launch
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const byId = id => document.getElementById(id);
  const CATEGORY = {business:'Business Website',portfolio:'Personal Portfolio',ecommerce:'Online Store',creative:'Creative Website',other:'Custom Website'};
  const THEMES = {burgundy:'Burgundy',darkred:'Black & Red',silver:'Silver Diamond',festive:'Festive'};
  const STYLES = {minimal:'Premium Minimal',border:'Border & Logo',festive:'Festive Style',overhaul:'Complete Overhaul'};
  const STATUS = ['pending','accepted','building','completed','rejected'];
  const clean = value => String(value ?? '').trim();
  const shortDate = value => new Date(value).toLocaleDateString();
  let dbPromise = null, orders = [], offers = [], activeModal = null, lastFocused = null, toastTimer;
  let signedInAdminId = null, isAdminBusy = false;
  const showText = (id, text) => { const el=byId(id); if(el) el.textContent = String(text); };
  function toast(message) {
    const area=byId('toastContainer'); if(!area) return;
    clearTimeout(toastTimer); area.replaceChildren();
    const el=document.createElement('div'); el.className='toast'; el.setAttribute('role','status'); el.textContent=message; area.append(el);
    toastTimer=setTimeout(()=>el.remove(),5000);
  }
  function configured() {
    return /^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(CONFIG.supabaseUrl) &&
      /^(sb_publishable_|eyJ)/.test(CONFIG.publishableKey);
  }
  async function getClient() {
    if(!configured()) throw new Error('First configure Supabase URL and publishable key at the top of script.js.');
    if(!dbPromise) dbPromise=import('https://esm.sh/@supabase/supabase-js@2')
      .then(({createClient})=>createClient(CONFIG.supabaseUrl, CONFIG.publishableKey, {
        auth: {persistSession:true, autoRefreshToken:true, detectSessionInUrl:false}
      })).catch(err=>{dbPromise=null;throw new Error('Could not load Supabase SDK: '+err.message);});
    return dbPromise;
  }
  async function callFunction(name, body) {
    if(!configured()) throw new Error('Add your Supabase URL and publishable key to script.js first.');
    let response;
    try {
      response=await fetch(`${CONFIG.supabaseUrl}/functions/v1/${name}`, {
        method:'POST', headers:{'Content-Type':'application/json','apikey':CONFIG.publishableKey},
        body:JSON.stringify(body)
      });
    } catch {throw new Error('Cannot connect to the server. Check network, deployment and CORS allowed origins.');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.ok) throw new Error(data.error || `Request failed (HTTP ${response.status}).`);
    return data;
  }
  // Navigation, animation and anchor links
  showText('currentYear', new Date().getFullYear());
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); }
      });
    }, { threshold: .1 });
    $$('[data-reveal]').forEach(el => observer.observe(el));
  } else $$('[data-reveal]').forEach(el => el.classList.add('revealed'));

  byId('mobileMenuBtn')?.addEventListener('click', () => {
    const isOpen = byId('navLinks').classList.toggle('open');
    byId('mobileMenuBtn').setAttribute('aria-expanded', String(isOpen));
  });
  $$('.nav-link').forEach(link => link.addEventListener('click', () => {
    $$('.nav-link').forEach(el => el.classList.remove('active'));
    link.classList.add('active');
    byId('navLinks').classList.remove('open');
    byId('mobileMenuBtn').setAttribute('aria-expanded', 'false');
  }));

  // Accessible modal handling
  function openModal(id) {
    const modal = byId(id);
    if (!modal) return;
    if (activeModal) closeModal(activeModal, false);
    lastFocused = document.activeElement;
    activeModal = id;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    const first = $('input, textarea, button:not([disabled])', modal);
    (first || $('.modal-container', modal))?.focus();
  }
  function closeModal(id, restoreFocus = true) {
    const modal = byId(id);
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    activeModal = null;
    document.body.classList.remove('modal-open');
    if (restoreFocus && lastFocused?.isConnected) lastFocused.focus();
  }
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.closeModal)));
  $$('.modal-overlay').forEach(modal => modal.addEventListener('mousedown', event => {
    if (event.target === modal) closeModal(modal.id);
  }));
  document.addEventListener('keydown', event => {
    if (!activeModal) return;
    if (event.key === 'Escape') { closeModal(activeModal); return; }
    if (event.key !== 'Tab') return;
    const focusables = $$('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]', byId(activeModal))
      .filter(el => el.getClientRects().length);
    if (!focusables.length) return;
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  // Customization preview
  const picked = (name) => $(`input[name="${name}"]:checked`)?.value || '';
  const selectedFeatures = () => $$('input[name="features"]:checked').map(el => el.value);
  const getDesign = () => ({
    category: byId('websiteCategory').value,
    theme: picked('colorTheme'),
    style: picked('designStyle'),
    pages: byId('websitePages').value,
    features: selectedFeatures()
  });
  const headlines = {
    business: ['YOUR BUSINESS.', 'A stronger digital presence starts here.', 'Build trust, share your story, and welcome new customers.'],
    portfolio: ['MY PORTFOLIO.', 'Your creative work deserves to stand out.', 'Show your talent, skills, and favourite projects.'],
    ecommerce: ['YOUR STORE.', 'Make every product feel extraordinary.', 'A thoughtful shopping experience for your customers.'],
    creative: ['YOUR STORY.', 'Moments made more memorable online.', 'Create something personal and beautifully different.'],
    other: ['YOUR BRAND.', 'A beautiful digital presence starts here.', 'Designed with intention, crafted for your unique vision.']
  };
  function syncSelectedClasses() {
    $$('.palette-option, .style-option').forEach(label => label.classList.toggle('selected', !!$('input:checked', label)));
  }
  function updatePreview() {
    const design = getDesign(), frame = byId('livePreviewFrame');
    frame.className = `live-preview-frame theme-${design.theme} style-${design.style}`;
    const [brand, headline, subtitle] = headlines[design.category] || headlines.other;
    showText('previewBrand', brand);
    showText('previewHeadline', headline);
    showText('previewDescription', subtitle);
    syncSelectedClasses();
    showText('summaryCategory', CATEGORY[design.category]);
    showText('summaryTheme', THEMES[design.theme]);
    showText('summaryStyle', STYLES[design.style]);
    showText('summaryPages', design.pages === 'custom' ? 'Custom / Not Sure' : `${design.pages} Page${design.pages === '1' ? '' : 's'}`);
    showText('summaryFeatures', design.features.length ? design.features.join(', ') : 'None selected');
  }
  $$('#websiteCategory, #websitePages, input[name="colorTheme"], input[name="designStyle"], input[name="features"]').forEach(el => {
    el.addEventListener('change', updatePreview);
  });
  $$('.device-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('.device-btn').forEach(el => { el.classList.toggle('active', el === btn); el.setAttribute('aria-pressed', String(el === btn)); });
    byId('livePreviewStage').classList.toggle('is-mobile', btn.dataset.device === 'mobile');
  }));
  byId('resetCustomizerBtn')?.addEventListener('click', () => {
    byId('websiteCategory').value = 'business';
    byId('websitePages').value = '1';
    $('input[name="colorTheme"][value="burgundy"]').checked = true;
    $('input[name="designStyle"][value="minimal"]').checked = true;
    $$('input[name="features"]').forEach(el => el.checked = false);
    updatePreview();
    toast('Customizer reset.');
  });
  $$('.service-link[data-category]').forEach(link => link.addEventListener('click', () => {
    byId('websiteCategory').value = link.dataset.category;
    updatePreview();
  }));
  byId('continueOrderBtn')?.addEventListener('click', () => { updatePreview(); openModal('orderModal'); });
  updatePreview();


  // ---------------------- REAL CUSTOMER ORDERS ----------------------
  const trackingSecrets = 'shyamweb_private_tracking_v2';
  function rememberTracking(reference, token) {
    try {
      const old=JSON.parse(localStorage.getItem(trackingSecrets) || '{}');
      old[reference]=token;
      localStorage.setItem(trackingSecrets, JSON.stringify(old));
    } catch { /* User can still copy the displayed private tracking code. */ }
  }
  function savedTracking(reference) {
    try {return JSON.parse(localStorage.getItem(trackingSecrets) || '{}')[reference] || '';} catch {return '';}
  }
  function ensureTrackingUI() {
    const input=byId('trackingEmail');
    if(input) {
      input.type='text'; input.id='trackingToken'; input.name='trackingToken';
      input.autocomplete='off'; input.placeholder='Paste your private tracking code';
      input.setAttribute('aria-describedby','trackingHelp');
      const label=$('label[for="trackingEmail"]');
      if(label) {label.htmlFor='trackingToken';label.textContent='Private Tracking Code';}
      const hint=document.createElement('p'); hint.id='trackingHelp'; hint.className='tracking-help';
      hint.textContent='Your private code was shown after ordering. Reference + code are both needed; email alone is not enough.';
      input.closest('.form-group')?.append(hint);
    }
    const modal=byId('successModal');
    const refBox=$('.order-reference',modal);
    if(refBox && !byId('successTrackingToken')) {
      const block=document.createElement('div'); block.className='private-token-block';
      const label=document.createElement('span'); label.textContent='PRIVATE TRACKING CODE — KEEP THIS SAFE';
      const token=document.createElement('code'); token.id='successTrackingToken';
      block.append(label,token); refBox.after(block);
      const note=document.createElement('p'); note.className='tracking-help';
      note.textContent='Copy and keep BOTH your reference and private code. Anyone with both can view your order status.';
      block.after(note);
    }
  }
  ensureTrackingUI();
  let turnstileToken='',turnstileWidget=null;
  function mountTurnstile() {
    const form=byId('orderForm');if(!form)return;
    const container=document.createElement('div');container.className='turnstile-area';
    const info=document.createElement('p');info.className='tracking-help';
    info.textContent='Human verification protects the order form from automated spam.';
    container.append(info);
    const widget=document.createElement('div');widget.id='turnstileWidget';container.append(widget);
    const submit=byId('submitOrderBtn');submit?.before(container);
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>{
      if(!window.turnstile){showText('orderFormFeedback','Verification could not load.');return;}
      turnstileWidget=window.turnstile.render(widget,{
        sitekey:CONFIG.turnstileSiteKey,theme:'light',
        callback:token=>{turnstileToken=token;},
        'expired-callback':()=>{turnstileToken='';},
        'error-callback':()=>{turnstileToken='';}
      });
    };
    script.onerror=()=>showText('orderFormFeedback','Human verification could not load. Check your connection.');
    document.head.append(script);
  }
  mountTurnstile();

  byId('orderForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const form=event.currentTarget; if(!form.reportValidity()) return;
    if(!turnstileToken){showText('orderFormFeedback','Please complete human verification first.');return;}
    const btn=byId('submitOrderBtn'); btn.disabled=true;
    showText('orderFormFeedback','Sending your order securely...');
    const design=getDesign();
    try {
      const data=await callFunction('order-create', {
        customer_name:clean(byId('customerName').value),
        customer_email:clean(byId('customerEmail').value).toLowerCase(),
        customer_phone:clean(byId('customerContact').value) || null,
        project_title:clean(byId('projectTitle').value),
        project_description:clean(byId('projectDescription').value),
        project_reference_url:clean(byId('projectReference').value) || null,
        budget:byId('projectBudget').value,
        category:design.category, theme:design.theme, design_style:design.style,
        pages:design.pages, features:design.features,
        website:'shyamweb-store', // not trusted by server
        consent:byId('orderConsent').checked,turnstile_token:turnstileToken
      });
      showText('successOrderId',data.reference);
      showText('successTrackingToken',data.tracking_token);
      rememberTracking(data.reference,data.tracking_token);
      closeModal('orderModal',false); openModal('successModal');
      form.reset(); updatePreview(); showText('orderFormFeedback','');
      toast('Your real order has been saved in Supabase. Keep your private tracking code.');
      if(signedInAdminId) await loadDashboard();
    } catch(err) { showText('orderFormFeedback',err.message); toast('Order was not saved: '+err.message); }
    finally {btn.disabled=false;turnstileToken='';if(window.turnstile && turnstileWidget!==null)window.turnstile.reset(turnstileWidget);}
  });
  byId('copyOrderIdBtn')?.addEventListener('click',async()=>{
    const text=`Order: ${byId('successOrderId')?.textContent}\nPrivate tracking code: ${byId('successTrackingToken')?.textContent}`;
    try {await navigator.clipboard.writeText(text); toast('Reference and private tracking code copied.');}
    catch {toast('Copy both values manually to keep them safe.');}
  });

  function openTracking() {openModal('trackingModal');}
  byId('trackOrderBtn')?.addEventListener('click',openTracking);
  byId('footerTrackBtn')?.addEventListener('click',openTracking);
  // Codeword opens the dashboard shell immediately; never grants database permissions.
  function openDashboardShell() {
    closeModal('trackingModal', false);
    document.body.classList.add('admin-mode');
    byId('adminDashboard').hidden = false;
    showAdminPage('overview');
    window.scrollTo({top:0,behavior:'instant'});
    if (signedInAdminId) { loadDashboard(); return; }
    showLockedDashboard();
    // Restore real admin data silently only if a valid authenticated session exists.
    if (configured()) getClient().then(async client => {
      const {data:{session}} = await client.auth.getSession();
      if (!session || byId('adminDashboard').hidden) return;
      try { await enterAdmin(client); } catch { showLockedDashboard(); }
    }).catch(() => {});
  }
  function showLockedDashboard() {
    orders=[]; offers=[];
    ['statTotalOrders','statPendingOrders','statActiveProjects','statCompletedOrders'].forEach(id=>showText(id,'—'));
    const badge=$('.admin-user-badge'); if(badge) badge.textContent='Dashboard • Locked data';
    ['recentOrdersTable','allOrdersTable'].forEach(id=>{
      const tbody=byId(id); if(!tbody)return;tbody.replaceChildren();
      const tr=document.createElement('tr'); const td=document.createElement('td');td.colSpan=id==='allOrdersTable'?6:5;
      td.textContent='Real customer orders require an authenticated admin session.';tr.append(td);tbody.append(tr);
    });
    showText('adminProjectsList','Real projects are protected until an admin signs in.');
    showText('adminOffersList','Offer management is locked.');
    showText('adminSettingsContent','Dashboard opened with the shortcut. Private order data is protected by Supabase authentication.');
    const form=byId('adminOfferForm');if(form) $$('input,textarea,button',form).forEach(el=>el.disabled=true);
    let action=byId('adminUnlockAction');
    if(!action){
      action=document.createElement('div');action.id='adminUnlockAction';action.className='admin-unlock-action';
      const p=document.createElement('p');p.textContent='Dashboard khul gaya. Real orders dekhne aur manage karne ke liye admin account se sign in karo.';
      const btn=document.createElement('button');btn.type='button';btn.className='btn btn-primary';btn.textContent='Unlock Real Orders';
      btn.addEventListener('click',()=>openModal('adminLoginModal'));
      action.append(p,btn);
      byId('adminOverviewPage')?.prepend(action);
    }
    action.hidden=false;
  }
  function maybeOpenAdminLogin() {
    const field=byId('trackingOrderId');
    const text=clean(field?.value).toLowerCase().replace(/\s+/g,' ');
    if(text!=='shyam admin')return false;
    field.value='';openDashboardShell();return true;
  }
  byId('trackingOrderId')?.addEventListener('input',maybeOpenAdminLogin);
  byId('trackingForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    if(maybeOpenAdminLogin()) return;
    const ref=clean(byId('trackingOrderId').value).toUpperCase();
    const token=clean(byId('trackingToken').value) || savedTracking(ref);
    const result=byId('trackingResult'); result.replaceChildren();
    const p=document.createElement('p');p.textContent='Checking order...';result.append(p);
    try {
      const data=await callFunction('order-track',{reference:ref,tracking_token:token});
      p.replaceChildren();
      const title=document.createElement('strong');title.className='status-label';
      title.textContent=`${data.order.reference}: ${data.order.status.toUpperCase()}`;
      const subtitle=document.createElement('p');subtitle.textContent=data.order.project_title;
      const date=document.createElement('p');date.textContent=`Created: ${shortDate(data.order.created_at)}`;
      result.append(title,subtitle,date);
      const history=document.createElement('ul');history.className='tracking-timeline';
      (data.updates||[]).forEach(update=>{
        const li=document.createElement('li');
        li.textContent=`${shortDate(update.created_at)} — ${update.status}${update.public_note?' — '+update.public_note:''}`;
        history.append(li);
      });
      result.append(history);
    } catch(err) {p.textContent=err.message;}
  });

  // ---------------------- REAL ADMIN AUTH + RLS ----------------------
  function showAdminPage(name) {
    $$('.admin-page').forEach(el=>{el.hidden=el.id!==`admin${name[0].toUpperCase()}${name.slice(1)}Page`;});
    $$('.admin-nav-item').forEach(el=>el.classList.toggle('active',el.dataset.adminPage===name));
    showText('adminPageTitle',name[0].toUpperCase()+name.slice(1));
  }
  $$('[data-admin-page]').forEach(btn=>btn.addEventListener('click',()=>showAdminPage(btn.dataset.adminPage)));
  function leaveAdmin() {
    const unlock=byId('adminUnlockAction');if(unlock)unlock.hidden=true;
    signedInAdminId=null;
    document.body.classList.remove('admin-mode');
    byId('adminDashboard').hidden=true;
    orders=[];offers=[];
  }
  async function verifyAdmin(client) {
    const {data:{user},error:authErr}=await client.auth.getUser();
    if(authErr || !user) throw new Error('Admin sign-in is required.');
    const {data,error}=await client.from('admin_users').select('user_id').eq('user_id',user.id).maybeSingle();
    if(error) throw new Error('Could not verify administrator permissions: '+error.message);
    if(!data) throw new Error('This account is not an administrator.');
    return user.id;
  }
  async function enterAdmin(client) {
    signedInAdminId=await verifyAdmin(client);
    const badge=$('.admin-user-badge'); if(badge) badge.textContent='Administrator';
    const unlock=byId('adminUnlockAction');if(unlock)unlock.hidden=true;
    const offerForm=byId('adminOfferForm'); if(offerForm) $$('input, textarea, button',offerForm).forEach(el=>el.disabled=false);
    document.body.classList.add('admin-mode');
    byId('adminDashboard').hidden=false;
    showAdminPage('overview');
    window.scrollTo({top:0,behavior:'instant'});
    await loadDashboard();
  }
  byId('adminEntryBtn')?.addEventListener('click',()=>openModal('adminLoginModal'));
  byId('adminLoginForm')?.addEventListener('submit',async event=>{
    event.preventDefault(); if(!event.currentTarget.reportValidity()) return;
    const submit=$('button[type="submit"]',event.currentTarget); submit.disabled=true;
    showText('adminLoginFeedback','Verifying login...');
    try {
      const client=await getClient();
      const {error}=await client.auth.signInWithPassword({email:clean(byId('adminEmail').value),password:byId('adminPassword').value});
      byId('adminPassword').value='';
      if(error) throw error;
      try {await enterAdmin(client);}
      catch(err){await client.auth.signOut();leaveAdmin();throw err;}
      closeModal('adminLoginModal',false);showText('adminLoginFeedback','');
      toast('Authenticated as administrator.');
    }catch(err){showText('adminLoginFeedback',err.message);}
    finally {submit.disabled=false;}
  });
  byId('adminLogoutBtn')?.addEventListener('click',async()=>{
    try {const client=await getClient();await client.auth.signOut();}
    catch(err){toast('Sign-out could not reach server: '+err.message);}
    finally {leaveAdmin();window.scrollTo({top:0,behavior:'instant'});}
  });
  // No attempt to show any real data unless admin verified with authenticated JWT.
  async function loadDashboard() {
    if(!signedInAdminId || isAdminBusy) return;
    isAdminBusy=true;
    try {
      const client=await getClient(); await verifyAdmin(client);
      const [orderRes,offerRes]=await Promise.all([
        client.from('orders').select('id,reference,customer_name,customer_email,customer_phone,project_title,project_description,project_reference_url,budget,category,theme,design_style,pages,features,status,admin_notes,quoted_price_inr,created_at,updated_at').order('created_at',{ascending:false}).limit(500),
        client.from('offers').select('id,title,description,discount_percentage,is_active,created_at').order('created_at',{ascending:false})
      ]);
      if(orderRes.error) throw orderRes.error;
      if(offerRes.error) throw offerRes.error;
      orders=orderRes.data||[];offers=offerRes.data||[];
      renderDashboard();
    }catch(err){toast('Dashboard failed: '+err.message);}
    finally{isAdminBusy=false;}
  }
  byId('adminRefreshBtn')?.addEventListener('click',()=>{if(!signedInAdminId){toast('Real orders are locked until admin sign-in.');return;}loadDashboard();});
  byId('adminOrderFilter')?.addEventListener('change',renderOrders);
  const cell=(tr,value)=>{const td=document.createElement('td');td.textContent=String(value??'—');tr.append(td);return td;};
  async function changeStatus(order,newStatus,selector) {
    selector.disabled=true;
    try {
      const client=await getClient();
      const {error}=await client.from('orders').update({status:newStatus}).eq('id',order.id).select('id').single();
      if(error) throw error;
      toast('Real order status updated in Supabase.');
      await loadDashboard();
    }catch(err){selector.value=order.status;toast('Unable to update: '+err.message);}
    finally{selector.disabled=false;}
  }
  function renderTable(targetId,list,allowEdit=false) {
    const tbody=byId(targetId);if(!tbody)return;tbody.replaceChildren();
    if(!list.length){const tr=document.createElement('tr');const td=cell(tr,'No orders found.');td.colSpan=allowEdit?6:5;tbody.append(tr);return;}
    list.forEach(order=>{
      const tr=document.createElement('tr');
      cell(tr,order.reference);cell(tr,order.customer_name);
      cell(tr,allowEdit?order.project_title:CATEGORY[order.category]||'Custom Website');
      if(allowEdit){
        cell(tr,order.budget);const status=cell(tr,order.status);status.className='status-pill-cell';
        const td=document.createElement('td');
        const actions=document.createElement('div');actions.className='admin-order-actions';
        const select=document.createElement('select');select.setAttribute('aria-label','Status for '+order.reference);
        STATUS.forEach(s=>{const opt=document.createElement('option');opt.value=s;opt.textContent=s[0].toUpperCase()+s.slice(1);opt.selected=s===order.status;select.append(opt);});
        select.addEventListener('change',()=>changeStatus(order,select.value,select));
        const view=document.createElement('button');view.type='button';view.className='admin-view-btn';view.textContent='Details';
        view.addEventListener('click',()=>showOrderDetails(order));
        actions.append(select,view);td.append(actions);tr.append(td);
      } else {cell(tr,order.status);cell(tr,shortDate(order.created_at));}
      tbody.append(tr);
    });
  }
  function renderOrders(){const filter=byId('adminOrderFilter')?.value||'all';renderTable('allOrdersTable',orders.filter(o=>filter==='all'||o.status===filter),true);}
  function renderProjects(){
    const target=byId('adminProjectsList');if(!target)return;target.replaceChildren();
    const active=orders.filter(o=>['accepted','building'].includes(o.status));
    if(!active.length){const p=document.createElement('p');p.textContent='No active projects.';target.append(p);return;}
    active.forEach(order=>{const el=document.createElement('div');el.className='project-item';el.textContent=`${order.project_title} — ${order.status} (${order.reference})`;target.append(el);});
  }
  async function showOrderDetails(order){
    let modal=byId('orderDetailsModal');
    if(!modal){
      modal=document.createElement('div');modal.id='orderDetailsModal';modal.className='modal-overlay';modal.setAttribute('aria-hidden','true');
      const content=document.createElement('div');content.className='modal-container';content.setAttribute('role','dialog');content.setAttribute('aria-modal','true');content.setAttribute('aria-labelledby','detailsTitle');content.tabIndex=-1;
      modal.append(content);document.body.append(modal);
      modal.addEventListener('mousedown',e=>{if(e.target===modal)closeModal('orderDetailsModal');});
    }
    const content=$('.modal-container',modal);content.replaceChildren();
    const close=document.createElement('button');close.type='button';close.className='modal-close';close.setAttribute('aria-label','Close order details');close.textContent='×';close.addEventListener('click',()=>closeModal('orderDetailsModal'));
    const h=document.createElement('h2');h.id='detailsTitle';h.textContent='Order '+order.reference;
    const box=document.createElement('div');box.className='order-details-list';
    const fields=[['Customer',order.customer_name],['Email',order.customer_email],['Phone',order.customer_phone||'—'],['Project',order.project_title],['Description',order.project_description],['Reference website',order.project_reference_url||'—'],['Category',order.category],['Theme',order.theme],['Style',order.design_style],['Pages',order.pages],['Features',(order.features||[]).join(', ')||'None'],['Budget',order.budget],['Status',order.status],['Created',shortDate(order.created_at)]];
    fields.forEach(([name,value])=>{const row=document.createElement('p');const label=document.createElement('strong');label.textContent=name+': ';row.append(label,document.createTextNode(value));box.append(row);});
    const notesLabel=document.createElement('label');notesLabel.textContent='Private Admin Notes';notesLabel.htmlFor='adminNotesEditor';
    const notes=document.createElement('textarea');notes.id='adminNotesEditor';notes.rows=3;notes.maxLength=1500;notes.value=order.admin_notes||'';
    const save=document.createElement('button');save.type='button';save.className='btn btn-primary';save.textContent='Save private notes';
    save.addEventListener('click',async()=>{
      save.disabled=true;try{const client=await getClient();const {error}=await client.from('orders').update({admin_notes:notes.value.trim()||null}).eq('id',order.id);if(error)throw error;toast('Private notes saved.');closeModal('orderDetailsModal');await loadDashboard();}
      catch(err){toast(err.message);}finally{save.disabled=false;}
    });
    content.append(close,h,box,notesLabel,notes,save);
    openModal('orderDetailsModal');
  }
  byId('adminOfferForm')?.addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget;if(!form.reportValidity())return;
    const submit=$('button[type="submit"]',form);submit.disabled=true;
    try{
      const client=await getClient();
      const {error}=await client.from('offers').insert({
        title:clean(byId('offerTitle').value),description:clean(byId('offerDescription').value),
        discount_percentage:Number(byId('offerDiscount').value),is_active:true
      });
      if(error)throw error;
      form.reset();await loadDashboard();toast('Offer saved in Supabase.');
    }catch(err){toast('Offer failed: '+err.message);}finally{submit.disabled=false;}
  });
  function renderOffers(){
    const target=byId('adminOffersList');if(!target)return;target.replaceChildren();
    if(!offers.length){const p=document.createElement('p');p.textContent='No offers yet.';target.append(p);return;}
    offers.forEach(offer=>{
      const div=document.createElement('div');div.className='offer-item';
      const info=document.createElement('div'),strong=document.createElement('strong'),p=document.createElement('p');
      strong.textContent=`${offer.title} — ${offer.discount_percentage}% off ${offer.is_active?'(active)':'(inactive)'}`;p.textContent=offer.description;info.append(strong,p);
      const toggle=document.createElement('button');toggle.type='button';toggle.textContent=offer.is_active?'Deactivate':'Activate';
      toggle.addEventListener('click',async()=>{
        toggle.disabled=true;
        try{const client=await getClient();const {error}=await client.from('offers').update({is_active:!offer.is_active}).eq('id',offer.id);if(error)throw error;await loadDashboard();}catch(err){toast(err.message);}finally{toggle.disabled=false;}
      });
      const remove=document.createElement('button');remove.type='button';remove.textContent='Delete';
      remove.addEventListener('click',async()=>{
        if(!confirm('Delete this offer?'))return;
        remove.disabled=true;try{const client=await getClient();const {error}=await client.from('offers').delete().eq('id',offer.id);if(error)throw error;await loadDashboard();}catch(err){toast(err.message);}finally{remove.disabled=false;}
      });
      div.append(info,toggle,remove);target.append(div);
    });
  }
  function renderDashboard(){
    showText('statTotalOrders',orders.length);showText('statPendingOrders',orders.filter(o=>o.status==='pending').length);
    showText('statActiveProjects',orders.filter(o=>['accepted','building'].includes(o.status)).length);
    showText('statCompletedOrders',orders.filter(o=>o.status==='completed').length);
    renderTable('recentOrdersTable',orders.slice(0,6));renderOrders();renderProjects();renderOffers();
    showText('adminSettingsContent','Live Supabase connection. Admin operations are secured by Supabase Auth and Row Level Security. Dashboard displays the latest 500 orders.');
  }

  // Festive decoration: digital lights and CSS fireworks only, automatically reduced for motion preferences.
  function addFestiveDecor(){
    const deco=document.createElement('div');deco.className='festive-decor';deco.setAttribute('aria-hidden','true');
    const strings=document.createElement('div');strings.className='festive-overhead';
    for(let i=0;i<34;i++){
      const bulb=document.createElement('span');bulb.className='festive-bulb';
      bulb.style.setProperty('--i',String(i));strings.append(bulb);
    }
    deco.append(strings);
    ['left','right'].forEach(side=>{
      const chain=document.createElement('div');chain.className=`diwali-chain diwali-chain-${side}`;
      for(let i=0;i<13;i++){
        const light=document.createElement('span');light.style.setProperty('--i',String(i));chain.append(light);
      }deco.append(chain);
    });
    for(let i=0;i<8;i++){
      const burst=document.createElement('div');burst.className='festive-burst';burst.style.setProperty('--burst',String(i));
      for(let j=0;j<16;j++){
        const ray=document.createElement('span');ray.style.setProperty('--ray',String(j));burst.append(ray);
      }deco.append(burst);
    }
    const rangoli=document.createElement('div');rangoli.className='festive-rangoli';rangoli.innerHTML='<span></span><span></span><span></span>';
    deco.append(rangoli);document.body.append(deco);
  }
  addFestiveDecor();

  // Existing sessions are checked only when the admin shortcut is entered.
})();

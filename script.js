(() => {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const root = document.documentElement;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = $('#header');
  const menuButton = $('#menuBtn');
  const nav = $('#siteNav');
  const progress = $('#scrollProgress');
  const hero = $('#heroSculpture');
  const form = $('#enquiryForm');
  const formStatus = $('#formStatus');
  const send = $('#sendBtn');
  const config = window.STUDIO_CONFIG || {};
  const backendConfigured = /^https:\/\/.+\.supabase\.co\/?$/.test(config.url || '') && Boolean(config.publishableKey);
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  menuButton?.addEventListener('click', () => {
    const open = !nav.classList.contains('open');
    nav.classList.toggle('open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close menu' : 'Toggle menu');
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('open'); menuButton?.setAttribute('aria-expanded', 'false');
  }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { nav?.classList.remove('open'); menuButton?.setAttribute('aria-expanded','false'); }
  });

  let scrollTick = false;
  const updateScroll = () => {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, scrollY / max)})`;
    header?.classList.toggle('scrolled', scrollY > 32);
    scrollTick = false;
  };
  addEventListener('scroll', () => { if (!scrollTick) { requestAnimationFrame(updateScroll); scrollTick = true; } }, {passive:true});
  updateScroll();

  if (reducedMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  } else {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px 45px 0px' });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }

  if (!reducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches && hero) {
    let raf;
    hero.addEventListener('pointermove', (event) => {
      const rect = hero.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - .5;
      const y = (event.clientY - rect.top) / rect.height - .5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { hero.style.setProperty('--rx', `${-y * 8}deg`); hero.style.setProperty('--ry', `${x * 10}deg`); });
    });
    hero.addEventListener('pointerleave', () => { hero.style.setProperty('--rx', '0deg'); hero.style.setProperty('--ry', '0deg'); });
  }

  const fields = () => Object.fromEntries(new FormData(form).entries());
  const validate = (data) => {
    if (data.customer_name.trim().length < 2) return 'Please enter your name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact_email.trim())) return 'Please enter a valid email address.';
    if (!data.website_type || !data.budget) return 'Please select the project type and budget.';
    if (data.requirements.trim().length < 10) return 'Please add at least 10 characters about your idea.';
    return '';
  };
  const buildDraft = (data) => [
    'SHYAM STUDIO — PROJECT ENQUIRY (DRAFT)',
    '-----------------------------------',
    'Name: ' + data.customer_name,
    'Email: ' + data.contact_email,
    'Project: ' + data.website_type,
    'Budget: ' + data.budget,
    '', 'Description:', data.requirements,
    '', 'This is a local draft. Not submitted to the studio.'
  ].join('\n');

  $('#draftBtn')?.addEventListener('click', () => {
    const data = fields();
    const error = validate(data);
    if (error) { formStatus.textContent = error; formStatus.dataset.type = 'error'; return; }
    const file = new Blob([buildDraft(data)], {type:'text/plain;charset=utf-8'});
    const href = URL.createObjectURL(file);
    const anchor = document.createElement('a'); anchor.href = href; anchor.download = 'shyam-studio-enquiry-draft.txt';
    document.body.append(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(href), 1200);
    formStatus.textContent = 'Draft downloaded. This has NOT been sent.'; formStatus.dataset.type = 'success';
  });

  form?.addEventListener('submit', async e => {
    e.preventDefault();
    const data = fields();
    const error = validate(data);
    if (error) { formStatus.textContent = error; formStatus.dataset.type = 'error'; return; }
    if (!backendConfigured) {
      formStatus.textContent = 'Online submissions are not connected yet. Download your enquiry draft below.';
      formStatus.dataset.type = 'error'; return;
    }
    if (!window.supabase?.createClient) {
      formStatus.textContent = 'Submission service unavailable. Please retry or download a draft.';
      formStatus.dataset.type = 'error'; return;
    }
    send.disabled = true;
    send.querySelector('span').textContent = '…';
    formStatus.textContent = 'Submitting your enquiry…'; formStatus.dataset.type = '';
    try {
      const client = window.supabase.createClient(config.url, config.publishableKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
      const payload = {
        customer_name: data.customer_name.trim(),
        contact_email: data.contact_email.trim(),
        website_type: data.website_type,
        budget: data.budget,
        requirements: data.requirements.trim()
      };
      // Matches the existing public.studio_orders table + RLS INSERT policy.
      const { error: dbError } = await client.from('studio_orders').insert(payload);
      if (dbError) throw dbError;
      formStatus.textContent = 'Your enquiry was submitted. Thank you!';
      formStatus.dataset.type = 'success';
      form.reset();
    } catch (err) {
      console.warn('Order submission failed:', err?.message || 'Unknown error');
      formStatus.textContent = 'Could not send your enquiry. Check connection or download your draft.';
      formStatus.dataset.type = 'error';
    } finally { send.disabled = false; send.querySelector('span').textContent = '↗'; }
  });
})();

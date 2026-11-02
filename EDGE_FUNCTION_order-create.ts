// ShyamWeb.Store — public order creation, server validated and Turnstile protected.
// Deploy as `order-create`, with "Verify JWT" disabled (public endpoint).
// Set TURNSTILE_SECRET_KEY as an Edge Function secret (never expose to browser).
import { createClient } from 'npm:@supabase/supabase-js@2';

const ALLOWED = {
  budget: new Set(['not-sure','under-1000','1000-3000','3000-5000','5000-plus']),
  category: new Set(['business','portfolio','ecommerce','creative','other']),
  theme: new Set(['burgundy','darkred','silver','festive']),
  design_style: new Set(['minimal','border','festive','overhaul']),
  pages: new Set(['1','3','5','custom']),
  features: new Set(['contact','animations','gallery','dashboard']),
};
function allowedOrigin(origin: string | null): boolean {
  if (!origin) return true; // Dashboard tester and non-browser integrations.
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return true;
  return (Deno.env.get('FRONTEND_ORIGINS') || '').split(',').map(s=>s.trim()).filter(Boolean).includes(origin);
}
function headers(origin: string | null): HeadersInit {
  return {
    'Content-Type':'application/json',
    'Access-Control-Allow-Origin':origin && allowedOrigin(origin) ? origin : 'null',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'content-type,apikey',
    'Vary':'Origin',
    'Cache-Control':'no-store',
  };
}
function json(status:number, data:unknown, origin:string|null): Response {
  return new Response(JSON.stringify(data),{status,headers:headers(origin)});
}
function validPublicKey(req: Request): boolean {
  const value=req.headers.get('apikey') || '';
  let expected='';
  try {expected=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}').default || '';} catch {/* no key */}
  return !!value && (value===expected || value===Deno.env.get('SUPABASE_ANON_KEY'));
}
function adminClient() {
  const url=Deno.env.get('SUPABASE_URL')!;
  let secret='';
  try {secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}').default || '';} catch {/* no key */}
  secret ||= Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!url || !secret) throw new Error('Missing server-side Supabase credentials');
  return createClient(url,secret,{auth:{autoRefreshToken:false,persistSession:false}});
}
function str(x:unknown):string {return typeof x==='string'?x.trim():'';}
function bounded(x:unknown,min:number,max:number):string|null {
  const value=str(x); return value.length>=min && value.length<=max ? value : null;
}

Deno.serve(async req=>{
  const origin=req.headers.get('origin');
  if(!allowedOrigin(origin)) return json(403,{ok:false,error:'Origin not allowed.'},origin);
  if(req.method==='OPTIONS') return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=='POST') return json(405,{ok:false,error:'POST required.'},origin);
  if(!validPublicKey(req)) return json(401,{ok:false,error:'Invalid API key.'},origin);
  const secret=Deno.env.get('TURNSTILE_SECRET_KEY');
  if(!secret) return json(503,{ok:false,error:'Human verification is not configured on the server.'},origin);
  try {
    const raw=await req.text();
    if(raw.length>16000) return json(413,{ok:false,error:'Request too large.'},origin);
    let body:Record<string,unknown>;
    try {body=JSON.parse(raw);} catch {return json(400,{ok:false,error:'Invalid JSON.'},origin);}
    if(!body || typeof body!=='object' || Array.isArray(body)) return json(400,{ok:false,error:'Invalid request.'},origin);
    const name=bounded(body.customer_name,2,100);
    const email=bounded(body.customer_email,5,254)?.toLowerCase();
    const title=bounded(body.project_title,2,120);
    const description=bounded(body.project_description,10,3000);
    const phone=str(body.customer_phone);
    const link=str(body.project_reference_url);
    const captcha=str(body.turnstile_token);
    const features=body.features;
    if(!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !title || !description || phone.length>20 ||
      !Array.isArray(features) || features.length>4 || !features.every(f=>typeof f==='string' && ALLOWED.features.has(f)) ||
      !ALLOWED.budget.has(str(body.budget)) || !ALLOWED.category.has(str(body.category)) ||
      !ALLOWED.theme.has(str(body.theme)) || !ALLOWED.design_style.has(str(body.design_style)) ||
      !ALLOWED.pages.has(str(body.pages)) || body.consent!==true) {
      return json(400,{ok:false,error:'Please review your details and selected options.'},origin);
    }
    if(link) {
      try {const url=new URL(link);if(!['https:','http:'].includes(url.protocol) || link.length>500) throw new Error();}
      catch {return json(400,{ok:false,error:'Reference URL must be a valid website address.'},origin);}
    }
    if(!captcha || captcha.length>2048) return json(400,{ok:false,error:'Complete the human verification challenge.'},origin);

    // Validate captcha server-side. Never trust only the browser widget.
    const form=new FormData();form.set('secret',secret);form.set('response',captcha);
    const challenge=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:form});
    if(!challenge.ok) return json(503,{ok:false,error:'Verification is temporarily unavailable.'},origin);
    const checked=await challenge.json();
    if(checked.success!==true) return json(403,{ok:false,error:'Verification failed or expired. Try again.'},origin);

    const {data,error}=await adminClient().from('orders').insert({
      customer_name:name,customer_email:email,customer_phone:phone||null,
      project_title:title,project_description:description,project_reference_url:link||null,
      budget:str(body.budget),category:str(body.category),theme:str(body.theme),
      design_style:str(body.design_style),pages:str(body.pages),features,
    }).select('reference,tracking_token,created_at').single();
    if(error){console.error('Create order database error:',error.code);return json(500,{ok:false,error:'Could not save this order. Please try again.'},origin);}
    return json(201,{ok:true,reference:data.reference,tracking_token:data.tracking_token,created_at:data.created_at},origin);
  }catch(err){console.error('Unexpected create-order error:',err instanceof Error?err.name:'unknown');return json(500,{ok:false,error:'Server error. Please try again.'},origin);}
});

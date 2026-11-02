// ShyamWeb.Store — customer-only status tracking by unguessable private UUID.
// Deploy as `order-track`, with "Verify JWT" disabled (public endpoint).
import { createClient } from 'npm:@supabase/supabase-js@2';
function allowedOrigin(origin:string|null):boolean {
  if(!origin)return true;
  if(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin))return true;
  return (Deno.env.get('FRONTEND_ORIGINS')||'').split(',').map(s=>s.trim()).filter(Boolean).includes(origin);
}
function headers(origin:string|null):HeadersInit{return {
  'Content-Type':'application/json',
  'Access-Control-Allow-Origin':origin&&allowedOrigin(origin)?origin:'null',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
  'Access-Control-Allow-Headers':'content-type,apikey',
  'Cache-Control':'no-store','Vary':'Origin'
};}
function json(status:number,data:unknown,origin:string|null):Response{return new Response(JSON.stringify(data),{status,headers:headers(origin)});}
function validPublicKey(req:Request):boolean {
  const value=req.headers.get('apikey')||'';
  let pub='';try{pub=JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}').default||'';}catch{/* no key */}
  return !!value&&(value===pub||value===Deno.env.get('SUPABASE_ANON_KEY'));
}
function adminClient(){
  let key='';try{key=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||'';}catch{/* no key */}
  key||=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
  if(!key)throw new Error('Missing server key');
  return createClient(Deno.env.get('SUPABASE_URL')!,key,{auth:{persistSession:false,autoRefreshToken:false}});
}
Deno.serve(async req=>{
  const origin=req.headers.get('origin');
  if(!allowedOrigin(origin))return json(403,{ok:false,error:'Origin not allowed.'},origin);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  if(req.method!=='POST')return json(405,{ok:false,error:'POST required.'},origin);
  if(!validPublicKey(req))return json(401,{ok:false,error:'Invalid API key.'},origin);
  try{
    const raw=await req.text();if(raw.length>1000)return json(413,{ok:false,error:'Request too large.'},origin);
    const body=JSON.parse(raw);
    const reference=String(body.reference||'').trim().toUpperCase();
    const token=String(body.tracking_token||'').trim().toLowerCase();
    if(!/^SW-[A-F0-9]{12}$/.test(reference) || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(token))
      return json(400,{ok:false,error:'Enter a valid reference and private tracking code.'},origin);
    const admin=adminClient();
    const {data:order,error}=await admin.from('orders').select('id,reference,project_title,status,created_at')
      .eq('reference',reference).eq('tracking_token',token).maybeSingle();
    if(error)throw error;
    if(!order)return json(404,{ok:false,error:'No order matches this reference and private code.'},origin);
    const {data:updates,error:updatesError}=await admin.from('order_updates').select('status,public_note,created_at')
      .eq('order_id',order.id).order('created_at',{ascending:true}).limit(100);
    if(updatesError)throw updatesError;
    const {id:_,...safeOrder}=order;
    return json(200,{ok:true,order:safeOrder,updates:updates||[]},origin);
  }catch(err){console.error('Tracking error:',err instanceof Error?err.name:'unknown');return json(500,{ok:false,error:'Unable to check order right now.'},origin);}
});

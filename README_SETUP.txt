SHYAMWEB.STORE — DIWALI PRODUCTION V4 (NO AI / NO DEMO)
=====================================================

GITHUB PAGES: Upload ONLY index.html, style.css, script.js to the root of your GitHub repo. ZIP has NO parent folder. Do NOT upload backend function code to your public site.

WHAT CHANGED:
- Removed entire AI section, floating assistant button, chat popup, AI requests and AI demo text.
- Added vivid Diwali design, digital diyas, rangoli, festive lights, gentle fireworks, improved cards, hover effects, responsive styles.
- Preserved actual order creation, private tracking and authenticated admin dashboard code (no fake demo orders).
- Reference input shortcut 'shyam admin' opens authenticated dashboard for already-verified session, otherwise Supabase login. No public bypass to customer records.

FRONTEND SETUP: Replace these in script.js: supabaseUrl, publishableKey, turnstileSiteKey. Only public/publishable keys belong in frontend. Never put Gemini key or service-role key in GitHub.

SUPABASE: Database RLS must be enabled with the previous schema. Deploy order-create and order-track Edge Functions separately by copying the corresponding EDGE_FUNCTION_*.ts code into their own index.ts files via Supabase dashboard. Set FRONTEND_ORIGINS and TURNSTILE_SECRET_KEY as secrets. Both public functions require their own internal validation, and Verify JWT OFF if using these versions. Supabase Auth + admin_users still required for admin data.

TURNSTILE: Replace TEST site/secret keys with real matching keys before publishing. Turnstile test keys are NOT protection. Configure allowed origins and add request rate limiting.

PLEASE NOTE: Cannot test against your private Supabase project from this environment. No false claim that backend already works live. Test an actual order, track reference+private token, then sign in and change its status in admin.

NO NEED TO USE GEMINI_API_KEY anymore. You may delete the old ai-chat Edge Function if not needed. Existing Gemini key should be kept private/revoked if exposed.

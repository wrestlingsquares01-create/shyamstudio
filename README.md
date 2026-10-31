# SHYAM STUDIO — Portfolio Replacement V2

A **static HTML/CSS/JS** portfolio with three standalone interactive concept demos. Intended to replace the old public website at `shyam.website`, using the EXISTING GitHub repository and Cloudflare Pages deployment. No new domain, DNS, or hosting required.

## Files
- `index.html` — portfolio: hero, 3 clickable demos, services and enquiry form.
- `style.css` — fully responsive visual design.
- `script.js` — navigation, motion, form validation, enquiry download and optional Supabase submission.
- `config.js` — optional public Supabase configuration; leave empty until ready.
- `assets/` — local SVG sculpture, coffee illustration, favicon.
- `demos/vela/index.html` — interactive café site and menu filters.
- `demos/atelier/index.html` — architecture/interiors concept and project chooser.
- `demos/voltage/index.html` — creator concept and interactive campaign selector.

## Preview
Open with VS Code Live Server or Python's `python -m http.server 8000`. Visit `/`.

## Replacing the existing site on GitHub
1. DOWNLOAD your existing repository as ZIP for backup. Your old chat/admin pages can be kept in that backup.
2. In the SAME GitHub repository, replace the website `index.html`, `style.css`, `script.js`, `config.js`, and add the `assets` and `demos` folders, keeping those folders and their exact file paths. Remove obsolete public files if you no longer want them live (e.g. old `admin.html`, `community.html`, `portfolio.html`); deleting or overwriting repo files should be intentional.
3. Commit all changes to the branch Cloudflare Pages deploys (usually `main`). Cloudflare Pages redeploys automatically.
4. Check `https://shyam.website` and the demo paths on both mobile and desktop. Clear browser cache if needed. Cloudflare Pages must use the repository root as its output directory.

**Important:** GitHub DOES support folders. For nested folders, use GitHub web uploads that preserve directory paths or push with Git. You may also upload a folder via dragging it in a supported GitHub upload interface. Your local SVGs are referenced from `assets/` intentionally; do not move them into the root unless you also update the file paths.

## Enquiries / optional Supabase integration
The enquiry form works in two modes:
- **Without backend config:** Validate the form and click **DOWNLOAD MY ENQUIRY AS A DRAFT** to save the request locally. Clicking **SEND** clearly says the online submission is not connected, so nobody is misled into thinking it reached you.
- **With Supabase config:** Copy your **Supabase project URL** and **publishable / anon key** from your existing safe client configuration into `config.js`, then upload and redeploy that file. Do not put your admin password, service-role key, database password, or secret key into browser code. The page sends an anonymous INSERT to `public.studio_orders` matching the SQL schema from THE STUDIO backend:
  - `customer_name` (text)
  - `contact_email` (text)
  - `website_type` (text)
  - `budget` (text)
  - `requirements` (text)
  - `status` set by database default to `pending`

The existing RLS policy must allow public INSERT but not public SELECT/UPDATE/DELETE. The previous order-admin login is not included in this simpler new portfolio; inquiries, if connected, can be viewed securely from Supabase Dashboard → Table Editor → studio_orders. You can later build a protected admin tool separately.

### Security and business checklist
- Public anonymous forms attract spam; for a real business launch add CAPTCHA/Turnstile verification server-side, rate limiting, and appropriate privacy/data retention messaging. Existing simple RLS is not spam protection.
- Confirm mail/contact details before publishing; do not fake customer reviews or paid commissions. All demo brands are fictional concepts, labelled as such.
- No online payments are connected. A submitted request is a request, not a confirmed order or guaranteed sale.
- Since this site can be used commercially and the owner is under 18, handle client agreements/payments with a parent or guardian and check relevant platform requirements.
- Optional Google Fonts and Supabase JS CDN need internet access; designs fall back to system fonts when offline.

## Last QA
- Header navigation and anchor scrolling
- 3 demos open correctly and interact: café filter, architecture projects, creator drops
- Form validation and draft download
- Supabase order insert if config is filled
- Small phone width: no horizontal overflow, form input visible, accessible navigation
- HTTPS `shyam.website` opens with images visible

# GMM Lead-Gen Funnel

3-page custom funnel for Growth Marketing Media, built to Sage's developer spec.
Static HTML/CSS/JS — deploys to Vercel, feeds GoHighLevel for booking + CRM.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Landing page with A/B hero test (Variant A: "7 Days" / Variant B: "50 Job Calls") |
| `calendar.html` | GHL booking embed → redirects to confirmation on booking |
| `confirmation.html` | "You're booked" + add-to-calendar + testimonial videos |
| `styles.css` | Shared design system (brand colors, fonts, components) |
| `script.js` | A/B logic, zip modal, webhook, navigation |

## How it flows
Landing → any CTA opens zip modal → valid 5-digit zip → (fires GHL webhook) → `calendar.html` → GHL booking → `confirmation.html` (fires conversion event).

## ⚠️ Placeholders to fill before/after launch
Search the codebase for these:

1. **`GTM-XXXXXXX`** (all 3 HTML files) — replace with the real Google Tag Manager ID, then
   uncomment the GTM `<script>` block in `<head>` and the `<noscript>` in `index.html`.
2. **`ZIP_WEBHOOK_URL: null`** (`script.js`) — paste the GHL inbound webhook URL for zip submits.
   Until set, the funnel still works and navigates to the calendar; it just doesn't push the zip to GHL.
3. **`REPLACE_1 / REPLACE_3 / REPLACE_4 / REPLACE_6`** (`index.html`) — 4 of the 6 Client Results
   videos are placeholders. Only #2 (`AoOlJl_JYmI`) and #5 (`uoGgsMHXrVA`) were provided. For each,
   set `data-vid` + `href` to `https://www.youtube.com/watch?v={ID}` and the thumbnail `src` to
   `https://img.youtube.com/vi/{ID}/hqdefault.jpg`.
4. **GHL calendar embed** (`calendar.html`) — currently uses booking id `9WIdxZKft7481V1mX5uz` from the spec. Confirm this is the correct calendar.

## Local preview
Open `index.html` in a browser. To force a hero variant for QA:
`sessionStorage.setItem('ab_variant','A')` (or `'B'`) in the console, then reload.

## Deploy
Static site — deploy the folder to Vercel (no build step). `vercel.json` enables clean URLs.

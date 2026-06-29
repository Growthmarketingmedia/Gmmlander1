/* ==========================================================================
   GMM Lead-Gen Funnel — shared JS
   - A/B variant assignment (Page 1)
   - Zip-code modal
   - Webhook on zip submit -> GHL pipeline (placeholder URL)
   - Navigation to calendar page
   ========================================================================== */

// ----- CONFIG: fill these in once provided -----
var CONFIG = {
  // GHL inbound webhook for zip submissions. Leave null until Sage provides it.
  ZIP_WEBHOOK_URL: null,        // e.g. "https://services.leadconnectorhq.com/hooks/.../webhook-trigger/..."
  CALENDAR_PAGE:  "calendar.html",
  CONFIRM_PAGE:   "confirmation.html"
};

/* ---------- A/B test (Page 1 hero only) ---------- */
function initABTest() {
  var heroA = document.getElementById('hero-a');
  var heroB = document.getElementById('hero-b');
  if (!heroA || !heroB) return;

  // Persist the variant so a reload doesn't reshuffle the experience.
  var variant = sessionStorage.getItem('ab_variant');
  if (variant !== 'A' && variant !== 'B') {
    variant = Math.random() < 0.5 ? 'A' : 'B';
    sessionStorage.setItem('ab_variant', variant);
  }

  document.body.setAttribute('data-variant', variant);
  heroA.style.display = variant === 'A' ? 'block' : 'none';
  heroB.style.display = variant === 'B' ? 'block' : 'none';

  // Report variant to GTM/GA4 as a custom dimension.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'ab_variant', variant: variant });
}

/* ---------- Zip modal ---------- */
function initModal() {
  var overlay = document.getElementById('zip-modal');
  if (!overlay) return;

  var input  = document.getElementById('zip-input');
  var error  = document.getElementById('zip-error');
  var form   = document.getElementById('zip-form');
  var closeBtn = overlay.querySelector('.modal-close');

  function open() {
    overlay.classList.add('open');
    if (error) error.textContent = '';
    setTimeout(function () { if (input) input.focus(); }, 50);
    document.body.style.overflow = 'hidden';
  }
  function close() {
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Any element with [data-open-zip] opens the modal.
  document.querySelectorAll('[data-open-zip]').forEach(function (el) {
    el.addEventListener('click', function (e) { e.preventDefault(); open(); });
  });

  if (closeBtn) closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var zip = (input.value || '').trim();
      if (!/^\d{5}$/.test(zip)) {
        error.textContent = 'Please enter a valid zip code';
        return;
      }
      error.textContent = '';
      submitZip(zip);
    });
  }
}

/* ---------- Submit zip -> webhook -> navigate ---------- */
function submitZip(zip) {
  var variant = sessionStorage.getItem('ab_variant') || '';

  // Track conversion intent.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'zip_submit', zip: zip, variant: variant });

  // Persist for the booking/confirmation pages.
  try { sessionStorage.setItem('lead_zip', zip); } catch (err) {}

  function go() { window.location.href = CONFIG.CALENDAR_PAGE; }

  // Fire the GHL webhook if configured; never block navigation on it.
  if (CONFIG.ZIP_WEBHOOK_URL) {
    try {
      fetch(CONFIG.ZIP_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip: zip, variant: variant, source: 'lead-funnel' }),
        keepalive: true
      }).catch(function () {});
    } catch (err) {}
    // Give the request a beat, then navigate regardless.
    setTimeout(go, 350);
  } else {
    go();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  initABTest();
  initModal();
});

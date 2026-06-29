/* ==========================================================================
   GMM Lead-Gen Funnel — shared JS
   - Inline zip-code forms (no popup)
   - Webhook on zip submit -> GHL pipeline (placeholder URL)
   - Passes the zip forward to the calendar page (?zip=) and on into GHL
   Variant is determined by which landing PAGE is loaded (body[data-variant]).
   ========================================================================== */

// ----- CONFIG: fill these in once provided -----
var CONFIG = {
  // GHL inbound webhook for zip submissions. Leave null until Sage provides it.
  ZIP_WEBHOOK_URL: null,        // e.g. "https://services.leadconnectorhq.com/hooks/.../webhook-trigger/..."
  CALENDAR_PAGE:  "calendar.html",
  CONFIRM_PAGE:   "confirmation.html"
};

function currentVariant() {
  return document.body.getAttribute('data-variant') || '';
}

/* ---------- Inline zip forms ---------- */
function initZipForms() {
  var forms = document.querySelectorAll('.zip-form');
  forms.forEach(function (form) {
    var input = form.querySelector('.zip-input');
    var error = form.querySelector('.zip-error');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var zip = (input.value || '').trim();
      if (!/^\d{5}$/.test(zip)) {
        if (error) error.textContent = 'Please enter a valid 5-digit zip code';
        input.focus();
        return;
      }
      if (error) error.textContent = '';
      submitZip(zip);
    });
  });
}

/* ---------- Submit zip -> webhook -> navigate (carrying the zip) ---------- */
function submitZip(zip) {
  var variant = currentVariant();

  // Track conversion intent.
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'zip_submit', zip: zip, variant: variant });

  // Persist for the booking/confirmation pages.
  try { sessionStorage.setItem('lead_zip', zip); } catch (err) {}

  // Carry the zip to the calendar page via the URL.
  function go() { window.location.href = CONFIG.CALENDAR_PAGE + '?zip=' + encodeURIComponent(zip); }

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
    setTimeout(go, 350);
  } else {
    go();
  }
}

/* ---------- Calendar page: receive the zip and pass it into the GHL embed ---------- */
function initCalendarZip() {
  var iframe = document.querySelector('.calendar-wrap iframe');
  if (!iframe) return;

  var params = new URLSearchParams(window.location.search);
  var zip = params.get('zip') || '';
  try { if (!zip) zip = sessionStorage.getItem('lead_zip') || ''; } catch (err) {}
  if (!zip) return;

  // Append the zip to the GHL booking iframe URL so it travels with the booking.
  // (GHL prefills a custom field if its query key matches — adjust the key if needed.)
  var src = iframe.getAttribute('src');
  if (src && src.indexOf('zip=') === -1) {
    iframe.setAttribute('src', src + (src.indexOf('?') === -1 ? '?' : '&') + 'zip=' + encodeURIComponent(zip));
  }

  // Optional: show which zip is being checked.
  var note = document.getElementById('zip-note');
  if (note) note.textContent = 'Checking availability for zip ' + zip + '.';
}

document.addEventListener('DOMContentLoaded', function () {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'landing_view', variant: currentVariant() });
  initZipForms();
  initCalendarZip();
});

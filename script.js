/* ==========================================================================
   GMM Lead-Gen Funnel — shared JS
   - Multi-step inline lead form (zip -> qualifying questions -> contact)
   - Webhook on submit -> GHL pipeline (placeholder URL)
   - Passes the full lead (incl. zip) forward to the calendar page
   Variant is determined by which landing PAGE is loaded (body[data-variant]).
   ========================================================================== */

// ----- CONFIG: fill these in once provided -----
var CONFIG = {
  // GHL inbound webhook that receives the whole lead. Leave null until provided.
  LEAD_WEBHOOK_URL: null,        // e.g. "https://services.leadconnectorhq.com/hooks/.../webhook-trigger/..."
  CALENDAR_PAGE:   "calendar.html",
  CONFIRM_PAGE:    "confirmation.html"
};

function currentVariant() {
  return document.body.getAttribute('data-variant') || '';
}

/* ---------- Persist form progress across refresh ---------- */
function formStateKey() { return 'lead_form_state_' + (currentVariant() || 'x'); }

function saveState(form, step) {
  var values = {};
  form.querySelectorAll('input, select').forEach(function (f) {
    if (!f.name) return;
    values[f.name] = (f.type === 'checkbox') ? f.checked : f.value;
  });
  try { sessionStorage.setItem(formStateKey(), JSON.stringify({ step: step, values: values })); } catch (e) {}
}

function restoreState(form) {
  var raw = null;
  try { raw = sessionStorage.getItem(formStateKey()); } catch (e) {}
  if (!raw) return 0;
  var saved;
  try { saved = JSON.parse(raw); } catch (e) { return 0; }
  if (!saved || !saved.values) return 0;

  form.querySelectorAll('input, select').forEach(function (f) {
    if (!f.name || !(f.name in saved.values)) return;
    if (f.type === 'checkbox') { f.checked = !!saved.values[f.name]; }
    else { f.value = saved.values[f.name]; }
  });
  // restore custom-dropdown labels from their hidden values
  form.querySelectorAll('.ms-dropdown').forEach(function (dd) {
    var hidden = dd.querySelector('input[type=hidden]');
    var label = dd.querySelector('.ms-dd-label');
    if (!hidden || !hidden.value || !label) return;
    dd.querySelectorAll('li').forEach(function (li) {
      if (li.getAttribute('data-value') === hidden.value) {
        label.textContent = li.textContent;
        label.classList.remove('placeholder');
      }
    });
  });
  return (typeof saved.step === 'number') ? saved.step : 0;
}

/* ---------- Multi-step lead form ---------- */
function initMultiStep() {
  var form = document.querySelector('.multistep');
  if (!form) return;

  var steps     = Array.prototype.slice.call(form.querySelectorAll('.ms-step'));
  var prevBtn   = form.querySelector('.ms-prev');
  var nextBtn   = form.querySelector('.ms-next');
  var submitBtn = form.querySelector('.ms-submit');
  var errorEl   = form.querySelector('.ms-error');
  var bar       = form.querySelector('.ms-bar > i');
  var total     = steps.length;
  var cur       = 0;

  initDropdowns(form);

  function render() {
    steps.forEach(function (s, i) { s.hidden = (i !== cur); });
    if (prevBtn)   prevBtn.hidden = (cur === 0);
    var last = (cur === total - 1);
    if (nextBtn)   nextBtn.hidden = last;
    if (submitBtn) submitBtn.hidden = !last;
    if (bar) bar.style.width = Math.round(((cur + 1) / total) * 100) + '%';
    if (errorEl) errorEl.textContent = '';
    var first = steps[cur].querySelector('input:not([type=hidden]), select, .ms-dd-toggle');
    if (first) setTimeout(function () { first.focus(); }, 40);
  }

  function validateStep(i) {
    var fields = steps[i].querySelectorAll('input, select');
    for (var k = 0; k < fields.length; k++) {
      var f = fields[k];
      if (f.type === 'checkbox') {
        if (!f.checked) return 'Please agree to the terms to continue.';
        continue;
      }
      var v = (f.value || '').trim();
      if (!v) return 'Please complete this field to continue.';
      if (f.name === 'zip' && !/^\d{5}$/.test(v)) return 'Please enter a valid 5-digit zip code.';
      if (f.type === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return 'Please enter a valid email address.';
    }
    return '';
  }

  function next() {
    var err = validateStep(cur);
    if (err) { errorEl.textContent = err; return; }
    if (cur < total - 1) { cur++; render(); saveState(form, cur); }
  }
  function prev() { if (cur > 0) { cur--; render(); saveState(form, cur); } }

  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var err = validateStep(cur);
    if (err) { errorEl.textContent = err; return; }
    submitLead(form);
  });

  // Enter advances (or submits on the last step).
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (cur < total - 1) { next(); } else { submitLead(form); }
    }
  });

  // Save as the user types/selects so a refresh doesn't lose anything.
  function persist() { saveState(form, cur); }
  form.addEventListener('input', persist);
  form.addEventListener('change', persist);

  // Restore any saved progress, then render that step.
  var restored = restoreState(form);
  cur = Math.min(Math.max(restored, 0), total - 1);
  render();
}

/* ---------- Custom dropdowns (stay inside the card) ---------- */
function initDropdowns(form) {
  var dropdowns = form.querySelectorAll('.ms-dropdown');
  dropdowns.forEach(function (dd) {
    var toggle = dd.querySelector('.ms-dd-toggle');
    var list   = dd.querySelector('.ms-dd-list');
    var label  = dd.querySelector('.ms-dd-label');
    var hidden = dd.querySelector('input[type=hidden]');
    if (!label.textContent.trim() || hidden.value === '') label.classList.add('placeholder');

    function close() { dd.classList.remove('open'); list.hidden = true; }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      var willOpen = !dd.classList.contains('open');
      // close any other open dropdowns in this form
      form.querySelectorAll('.ms-dropdown.open').forEach(function (o) {
        o.classList.remove('open'); o.querySelector('.ms-dd-list').hidden = true;
      });
      dd.classList.toggle('open', willOpen);
      list.hidden = !willOpen;
    });

    list.querySelectorAll('li').forEach(function (li) {
      li.addEventListener('click', function () {
        hidden.value = li.getAttribute('data-value');
        label.textContent = li.textContent;
        label.classList.remove('placeholder');
        hidden.dispatchEvent(new Event('input', { bubbles: true }));
        close();
      });
    });
  });

  // click outside closes
  document.addEventListener('click', function (e) {
    form.querySelectorAll('.ms-dropdown.open').forEach(function (dd) {
      if (!dd.contains(e.target)) { dd.classList.remove('open'); dd.querySelector('.ms-dd-list').hidden = true; }
    });
  });
}

/* ---------- Submit the full lead -> webhook -> calendar ---------- */
function submitLead(form) {
  var data = {};
  Array.prototype.forEach.call(form.querySelectorAll('input, select'), function (f) {
    if (!f.name) return;
    data[f.name] = (f.type === 'checkbox') ? f.checked : (f.value || '').trim();
  });
  data.variant = currentVariant();
  data.source = 'lead-funnel';

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'lead_submit', variant: data.variant, zip: data.zip });

  try {
    sessionStorage.setItem('lead_data', JSON.stringify(data));
    sessionStorage.setItem('lead_zip', data.zip || '');
    sessionStorage.removeItem(formStateKey());
  } catch (err) {}

  function go() { window.location.href = CONFIG.CALENDAR_PAGE + '?zip=' + encodeURIComponent(data.zip || ''); }

  if (CONFIG.LEAD_WEBHOOK_URL) {
    try {
      fetch(CONFIG.LEAD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        keepalive: true
      }).catch(function () {});
    } catch (err) {}
    setTimeout(go, 400);
  } else {
    go();
  }
}

/* ---------- Bottom CTA buttons just scroll up to the form ---------- */
function initScrollButtons() {
  document.querySelectorAll('[data-scroll-to-form]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      var f = document.querySelector('.multistep');
      if (!f) return;
      f.scrollIntoView({ behavior: 'smooth', block: 'center' });
      var inp = f.querySelector('input, select');
      if (inp) setTimeout(function () { inp.focus(); }, 450);
    });
  });
}

/* ---------- Calendar page: prefill the GHL booking form from the lead we collected ----------
   So the visitor doesn't re-type name / phone / email on the GHL calendar step. */
function initCalendar() {
  var iframe = document.querySelector('.calendar-wrap iframe');
  if (!iframe) return;

  var lead = {};
  try { lead = JSON.parse(sessionStorage.getItem('lead_data') || '{}') || {}; } catch (err) {}
  var params = new URLSearchParams(window.location.search);
  var zip = params.get('zip') || lead.zip || '';

  // GHL booking widgets prefill from standard query params.
  var qs = new URLSearchParams();
  var name = (lead.name || '').trim();
  if (name) {
    var parts = name.split(/\s+/);
    qs.set('first_name', parts.shift());
    if (parts.length) qs.set('last_name', parts.join(' '));
    qs.set('name', name);
    qs.set('full_name', name); // booking form uses a single "Full Name" field
  }
  if (lead.email) qs.set('email', lead.email);
  if (lead.phone) qs.set('phone', lead.phone);
  if (lead.company) qs.set('company_name', lead.company); // GHL standard "Company Name" field
  if (zip) qs.set('zip', zip);
  // If "name of your business" is a GHL CUSTOM field (not the standard Company Name),
  // swap the key above for its custom key, e.g. qs.set('<custom_field_key>', lead.company);

  var src = iframe.getAttribute('src');
  if (src && qs.toString() && src.indexOf('email=') === -1 && src.indexOf('first_name=') === -1) {
    iframe.setAttribute('src', src + (src.indexOf('?') === -1 ? '?' : '&') + qs.toString());
  }

  var note = document.getElementById('zip-note');
  if (note && zip) note.textContent = 'Your Territory for ' + zip + ' is available — claim it before it’s gone!';
}

document.addEventListener('DOMContentLoaded', function () {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'landing_view', variant: currentVariant() });
  initMultiStep();
  initScrollButtons();
  initCalendar();
});

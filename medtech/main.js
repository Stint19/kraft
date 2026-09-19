(function () {
  'use strict';

  /* Header border after scroll */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* КП sheet: one orchestrated load sequence */
  var sheet = document.getElementById('kp-sheet');
  if (sheet) {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { sheet.classList.add('is-play'); });
    });
  }

  /* Role tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.role-tab'));
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab, false); });
    tab.addEventListener('keydown', function (e) {
      var next = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') next = tabs[0];
      if (e.key === 'End') next = tabs[tabs.length - 1];
      if (next) { e.preventDefault(); selectTab(next, true); }
    });
  });

  /* Validation */
  function validContact(v) {
    v = v.trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) return true;
    var digits = v.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11 && /^[\d\s()+\-]+$/.test(v);
  }
  function validate(form) {
    var firstBad = null;
    form.querySelectorAll('[data-required]').forEach(function (field) {
      var input = field.querySelector('input, textarea');
      var val = input.value.trim();
      var ok = field.hasAttribute('data-contact') ? validContact(val) : val.length > 1;
      field.classList.toggle('is-invalid', !ok);
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      var err = field.querySelector('.error-msg');
      if (err) {
        if (!err.id) err.id = input.id + '-err';
        input.setAttribute('aria-describedby', err.id);
      }
      if (!ok && !firstBad) firstBad = input;
    });
    if (firstBad) firstBad.focus();
    return !firstBad;
  }
  function liveClear(form) {
    form.addEventListener('input', function (e) {
      var field = e.target.closest('[data-required]');
      if (field && field.classList.contains('is-invalid')) {
        var val = e.target.value.trim();
        var ok = field.hasAttribute('data-contact') ? validContact(val) : val.length > 1;
        if (ok) { field.classList.remove('is-invalid'); e.target.setAttribute('aria-invalid', 'false'); }
      }
    });
  }

  /* Podbor form */
  var podbor = document.getElementById('podbor-form');
  var podborSent = document.getElementById('podbor-sent');
  if (podbor) {
    liveClear(podbor);
    podbor.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(podbor)) return;
      podbor.hidden = true;
      podborSent.hidden = false;
      podborSent.focus();
    });
  }
  document.querySelectorAll('[data-reset="podbor"]').forEach(function (b) {
    b.addEventListener('click', function () {
      podbor.reset();
      podborSent.hidden = true;
      podbor.hidden = false;
      podbor.querySelector('input').focus();
    });
  });

  /* КП dialog */
  var dlg = document.getElementById('kp-dialog');
  var kpForm = document.getElementById('kp-form');
  var kpWrap = document.getElementById('kp-form-wrap');
  var kpSent = document.getElementById('kp-sent');
  var lastTrigger = null;

  function openKp(item) {
    if (!dlg) return;
    kpWrap.hidden = false;
    kpSent.hidden = true;
    if (item) kpForm.elements.what.value = item;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    var target = item ? kpForm.elements.contact : kpForm.elements.what;
    setTimeout(function () { target.focus(); }, 30);
  }
  function closeKp() {
    if (!dlg) return;
    if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open');
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-kp]');
    if (t) { lastTrigger = t; openKp(t.getAttribute('data-kp-item') || ''); }
    if (e.target.closest('[data-close]')) closeKp();
  });
  if (dlg) {
    dlg.addEventListener('click', function (e) { if (e.target === dlg) closeKp(); });
    dlg.addEventListener('close', function () {
      if (!kpSent.hidden) { kpForm.reset(); }
      kpForm.querySelectorAll('.is-invalid').forEach(function (f) { f.classList.remove('is-invalid'); });
      if (lastTrigger) lastTrigger.focus();
    });
    liveClear(kpForm);
    kpForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!validate(kpForm)) return;
      kpWrap.hidden = true;
      kpSent.hidden = false;
      kpSent.focus();
    });
  }

  /* Product gallery */
  var main = document.getElementById('gallery-main');
  document.querySelectorAll('.thumb').forEach(function (th) {
    th.addEventListener('click', function () {
      main.src = th.getAttribute('data-src');
      main.alt = th.getAttribute('data-alt');
      document.querySelectorAll('.thumb').forEach(function (o) { o.setAttribute('aria-pressed', o === th ? 'true' : 'false'); });
    });
  });

  /* Catalog: highlight current direction */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.dir-nav a'));
  if (navLinks.length && 'IntersectionObserver' in window) {
    var map = {};
    navLinks.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          navLinks.forEach(function (a) { a.classList.remove('is-active'); a.removeAttribute('aria-current'); });
          var a = map[en.target.id];
          if (a) {
            a.classList.add('is-active');
            a.setAttribute('aria-current', 'true');
            var ul = a.closest('ul');
            if (ul) {
              var l = a.offsetLeft - ul.offsetLeft;
              if (l < ul.scrollLeft || l + a.offsetWidth > ul.scrollLeft + ul.clientWidth) ul.scrollTo({ left: l - 16 });
            }
          }
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    Object.keys(map).forEach(function (id) {
      var sec = document.getElementById(id);
      if (sec) io.observe(sec);
    });
  }
})();

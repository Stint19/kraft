(function () {
  var root = document.documentElement;
  root.classList.add('js');
  requestAnimationFrame(function () {
    requestAnimationFrame(function () { root.classList.add('is-ready'); });
  });

  var top = document.querySelector('.top');
  var onScroll = function () { top.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var form = document.getElementById('audit-form');
  var done = document.getElementById('audit-done');
  var out = document.getElementById('audit-text');
  var again = document.getElementById('audit-again');
  var site = document.getElementById('f-site');
  var contact = document.getElementById('f-contact');

  function setError(input, msg) {
    var err = document.getElementById(input.id + '-err');
    err.textContent = msg || '';
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !msg;
  }

  function checkSite() {
    var v = site.value.trim();
    if (!v) return setError(site, 'Вставьте адрес сайта, например example.ru');
    var host = v.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0];
    if (!/^[^\s.]+(\.[^\s.]+)+$/.test(host)) return setError(site, 'Не похоже на адрес сайта. Проверьте, что есть точка и зона: example.ru');
    return setError(site, '');
  }

  function checkContact() {
    var v = contact.value.trim();
    if (!v) return setError(contact, 'Укажите @ник в Telegram или телефон, иначе некуда прислать разбор');
    var digits = v.replace(/\D/g, '');
    var isNick = /^@?[a-zA-Z][a-zA-Z0-9_]{3,31}$/.test(v);
    var isPhone = digits.length >= 10 && digits.length <= 15 && /^[+\d\s()\-]+$/.test(v);
    if (!isNick && !isPhone) return setError(contact, 'Нужен ник вида @name или телефон с кодом, например +7 900 123-45-67');
    return setError(contact, '');
  }

  site.addEventListener('blur', function () { if (site.value.trim()) checkSite(); });
  contact.addEventListener('blur', function () { if (contact.value.trim()) checkContact(); });
  site.addEventListener('input', function () { if (site.hasAttribute('aria-invalid')) checkSite(); });
  contact.addEventListener('input', function () { if (contact.hasAttribute('aria-invalid')) checkContact(); });

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).catch(fallback);
    }
    fallback();
    return Promise.resolve();
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta);
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok1 = checkSite();
    var ok2 = checkContact();
    if (!ok1) { site.focus(); return; }
    if (!ok2) { contact.focus(); return; }

    var text = 'Здравствуйте! Хочу бесплатный разбор сайта.\nСайт: ' + site.value.trim() + '\nКуда ответить: ' + contact.value.trim();
    out.textContent = text;
    copy(text);
    window.open('https://t.me/kraft_lp', '_blank', 'noopener');
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  again.addEventListener('click', function () {
    form.reset();
    done.hidden = true;
    form.hidden = false;
    site.focus();
  });
})();

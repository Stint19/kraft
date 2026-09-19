(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); };

  /* шапка */
  var top = document.querySelector('.top');
  var onScroll = function () { top.classList.toggle('is-scrolled', window.scrollY > 8); };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* шкала цены */
  var MIN = 9800, MAX = 18600;
  var PRICES = [
    [9800, 12400],
    [13200, 15900],
    [16400, 18600]
  ];
  var ZONES = ['Лицо, 1 мл', 'Лицо и шея, 2 мл', 'Лицо, шея и декольте, 3 мл'];
  var DRUGS = ['гиалуроновая кислота', 'гиалуроновая кислота с аминокислотами и пептидами'];

  var scale = document.querySelector('.scale');
  var ticks = document.querySelector('.scale__ticks');
  var sumEl = document.querySelector('[data-sum]');
  var detailEl = document.querySelector('[data-detail]');

  if (scale && ticks) {
    var frag = document.createDocumentFragment();
    for (var v = MIN; v <= MAX; v += 200) {
      var t = document.createElement('i');
      t.style.left = ((v - MIN) / (MAX - MIN) * 100) + '%';
      if (v % 1000 === 0) t.className = 'is-major';
      if (v % 2000 === 0 && v > MIN + 1000) {
        t.setAttribute('data-l', fmt(v));
        if (v === 14000 || v === 18000) t.classList.add('is-sub');
      }
      frag.appendChild(t);
    }
    ticks.appendChild(frag);
    var marks = scale.querySelector('.scale__marks');
    PRICES.forEach(function (row) { row.forEach(function (p) {
      var m = document.createElement('i');
      m.style.left = ((p - MIN) / (MAX - MIN) * 100) + '%';
      m.dataset.p = p;
      marks.appendChild(m);
    }); });

    var current = MIN, raf = null;
    var animateTo = function (target) {
      if (raf) cancelAnimationFrame(raf);
      if (reduce) { current = target; sumEl.textContent = fmt(target); return; }
      var from = current, start = null, dur = 600;
      var step = function (ts) {
        if (!start) start = ts;
        var k = Math.min(1, (ts - start) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        current = Math.round((from + (target - from) * e) / 100) * 100;
        sumEl.textContent = fmt(current);
        if (k < 1) raf = requestAnimationFrame(step); else { current = target; sumEl.textContent = fmt(target); }
      };
      raf = requestAnimationFrame(step);
      clearTimeout(animateTo.t);
      animateTo.t = setTimeout(function () { if (current !== target) { cancelAnimationFrame(raf); current = target; sumEl.textContent = fmt(target); } }, dur + 150);
    };

    var update = function () {
      var z = +document.querySelector('input[name="zone"]:checked').value;
      var d = +document.querySelector('input[name="drug"]:checked').value;
      var price = PRICES[z][d];
      scale.style.setProperty('--p', ((price - MIN) / (MAX - MIN)).toFixed(4));
      animateTo(price);
      marks.querySelectorAll('i').forEach(function (m) { m.classList.toggle('is-on', +m.dataset.p === price); });
      ticks.querySelectorAll('i[data-l]').forEach(function (t) { t.classList.toggle('is-near', Math.abs(+t.getAttribute('data-l').replace(/\D/g, '') - price) < 500); });
      detailEl.textContent = ZONES[z] + ', ' + DRUGS[d] + '. Цена одной процедуры, консультация и контрольный осмотр уже внутри. Курс обычно из 2–3 процедур.';
    };
    document.querySelectorAll('.gauge input').forEach(function (i) { i.addEventListener('change', update); });
    update();
  }

  /* запись */
  var form = document.getElementById('booking');
  if (!form) return;
  var done = document.getElementById('booking-done');
  var daysBox = form.querySelector('[data-days]');
  var slotsBox = form.querySelector('[data-slots]');
  var WD = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  var MON = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  var WD_FULL = ['воскресенье', 'понедельник', 'вторник', 'среду', 'четверг', 'пятницу', 'субботу'];
  var WD_NOM = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  var WEEK = ['9:30', '11:00', '12:30', '14:00', '15:30', '17:00', '18:30', '19:30'];
  var SAT = ['10:00', '11:30', '13:00', '14:30', '16:00'];

  var days = [];
  var d0 = new Date(); d0.setHours(0, 0, 0, 0);
  for (var i = 1; days.length < 6 && i < 14; i++) {
    var dt = new Date(d0); dt.setDate(d0.getDate() + i);
    if (dt.getDay() !== 0) days.push(dt);
  }
  var state = { day: 0, slot: null };

  var seeded = function (seed, n) { var x = Math.sin(seed * 9301 + n * 49297) * 233280; return x - Math.floor(x); };

  var MON_NOM = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  var legend = daysBox.parentNode.querySelector('legend');
  var renderDays = function () {
    var ms = [];
    days.forEach(function (dt) { var m = MON_NOM[dt.getMonth()]; if (ms.indexOf(m) < 0) ms.push(m); });
    legend.textContent = 'День, ' + ms.join(' и ');
    daysBox.innerHTML = '';
    days.forEach(function (dt, idx) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', idx === state.day ? 'true' : 'false');
      b.setAttribute('aria-label', WD_NOM[dt.getDay()] + ', ' + dt.getDate() + ' ' + MON[dt.getMonth()]);
      b.innerHTML = '<small>' + WD[dt.getDay()] + '</small><strong>' + dt.getDate() + '</strong>';
      b.addEventListener('click', function () { state.day = idx; state.slot = null; renderDays(); renderSlots(); });
      daysBox.appendChild(b);
    });
  };

  var renderSlots = function () {
    var dt = days[state.day];
    var list = dt.getDay() === 6 ? SAT : WEEK;
    var seed = dt.getDate() + dt.getMonth() * 31;
    slotsBox.innerHTML = '';
    list.forEach(function (time, n) {
      var busy = seeded(seed, n) < (state.day === 0 ? .6 : .38);
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = time;
      b.disabled = busy;
      if (busy) b.setAttribute('aria-label', time + ', занято');
      b.setAttribute('aria-pressed', state.slot === time ? 'true' : 'false');
      b.addEventListener('click', function () {
        state.slot = time;
        slotsBox.querySelectorAll('button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        showErr('slot', false);
      });
      slotsBox.appendChild(b);
    });
  };

  renderDays();
  renderSlots();

  /* маска телефона */
  var phone = form.elements.phone;
  var digits = function (s) {
    var x = s.replace(/\D/g, '');
    if (x[0] === '8' || x[0] === '7') x = x.slice(1);
    return x.slice(0, 10);
  };
  phone.addEventListener('input', function () {
    var x = digits(phone.value);
    if (!x) { phone.value = ''; return; }
    var out = '+7 ' + x.slice(0, 3);
    if (x.length > 3) out += ' ' + x.slice(3, 6);
    if (x.length > 6) out += '-' + x.slice(6, 8);
    if (x.length > 8) out += '-' + x.slice(8, 10);
    phone.value = out;
  });

  var showErr = function (key, on) {
    var el = form.querySelector('[data-err="' + key + '"]');
    if (el) el.hidden = !on;
    var input = form.elements[key];
    if (input && input.setAttribute) {
      input.setAttribute('aria-invalid', on ? 'true' : 'false');
      if (on) input.setAttribute('aria-describedby', el.id || (el.id = 'err-' + key));
    }
  };
  form.elements.name.addEventListener('input', function () { showErr('name', false); });
  phone.addEventListener('input', function () { if (digits(phone.value).length === 10) showErr('phone', false); });
  form.elements.agree.addEventListener('change', function () { showErr('agree', false); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var bad = [];
    if (!state.slot) bad.push('slot');
    if (form.elements.name.value.trim().length < 2) bad.push('name');
    if (digits(phone.value).length !== 10) bad.push('phone');
    if (!form.elements.agree.checked) bad.push('agree');
    ['slot', 'name', 'phone', 'agree'].forEach(function (k) { showErr(k, bad.indexOf(k) > -1); });
    if (bad.length) {
      var first = bad[0] === 'slot' ? slotsBox.querySelector('button:not(:disabled)') : form.elements[bad[0]];
      if (first) first.focus();
      return;
    }
    var dt = days[state.day];
    var service = form.querySelector('input[name="service"]:checked').value.toLowerCase();
    done.querySelector('[data-done-text]').textContent =
      form.elements.name.value.trim() + ', ' + service + ' в ' + WD_FULL[dt.getDay()] + ', ' + dt.getDate() + ' ' + MON[dt.getMonth()] +
      ', в ' + state.slot + '. Администратор позвонит на номер ' + phone.value + ', чтобы подтвердить запись.';
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });

  done.querySelector('[data-reset]').addEventListener('click', function () {
    state.slot = null;
    renderSlots();
    done.hidden = true;
    form.hidden = false;
    slotsBox.querySelector('button:not(:disabled)').focus();
  });
})();

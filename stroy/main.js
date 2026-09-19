(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return String(n).replace('.', ','); };
  var rub = function (n) { return n.toLocaleString('ru-RU') + ' ₽'; };

  /* ---------- Время по Москве (можно подменить ?t=10:42 для проверки) ---------- */
  function nowMinutes() {
    var m = /[?&]t=(\d{1,2}):(\d{2})/.exec(location.search);
    if (m) return +m[1] * 60 + +m[2];
    try {
      var parts = new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var h = 0, mi = 0;
      parts.forEach(function (p) { if (p.type === 'hour') h = +p.value % 24; if (p.type === 'minute') mi = +p.value; });
      return h * 60 + mi;
    } catch (e) {
      var d = new Date(); return d.getHours() * 60 + d.getMinutes();
    }
  }
  function clock(min) { return Math.floor(min / 60) + ':' + ('0' + (min % 60)).slice(-2); }
  function left(min) {
    var h = Math.floor(min / 60), m = min % 60;
    return (h ? h + ' ч ' : '') + m + ' мин';
  }

  var CUT = 720, OPEN = 450, CLOSE = 1200;

  function renderStatus() {
    var t = nowMinutes();
    var box = $('status');
    $('status-now').textContent = 'Сейчас ' + clock(t) + '.';
    var txt;
    if (t < OPEN) {
      txt = 'Диспетчер ответит с 7:30. Заявки на сегодня принимаем до 12:00.';
      box.classList.remove('is-closed');
    } else if (t < CUT) {
      txt = 'Успеваете на сегодня: до отсечки ' + left(CUT - t) + '.';
      box.classList.remove('is-closed');
    } else if (t < CLOSE) {
      txt = 'Сегодняшние рейсы собраны, привезём завтра с 8:00. Бывает, что в рейсе остаётся место: позвоните.';
      box.classList.add('is-closed');
    } else {
      txt = 'Напишите сейчас, ответим с 7:30. Машина выйдет в 8:00.';
      box.classList.add('is-closed');
    }
    $('status-text').textContent = txt;

    // Отметка «сейчас» на расписании дня
    var list = $('day-list');
    var old = list.querySelector('.day__now');
    if (old) old.remove();
    var rows = list.querySelectorAll('.day__row');
    var placed = false;
    rows.forEach(function (r) {
      var m = +r.getAttribute('data-min');
      r.classList.toggle('is-past', m <= t && t >= OPEN);
      if (!placed && m > t && t >= OPEN && t < CLOSE) {
        var li = document.createElement('li');
        li.className = 'day__now';
        li.innerHTML = '<span>' + clock(t) + '</span><span>Вы здесь</span>';
        list.insertBefore(li, r);
        placed = true;
      }
    });
  }

  /* ---------- Парк и зоны ---------- */
  var TRUCKS = [
    { id: 'm5', name: 'Манипулятор 5 т', cap: 5, len: 6.2, crane: true, spec: 'Кузов 6,2 м, стрела 3 т, вылет 10 м', price: [8500, 11500, 16000] },
    { id: 'm10', name: 'КамАЗ-манипулятор 10 т', cap: 10, len: 7.8, crane: true, spec: 'Кузов 7,8 м, стрела 7 т, вылет 18 м', price: [11000, 14500, 20000] },
    { id: 'd20', name: 'Длинномер 20 т', cap: 20, len: 13.6, crane: false, spec: 'Полуприцеп 13,6 м, разгрузка сбоку, без крана', price: [12000, 16000, 22000] },
    { id: 'dm', name: 'Длинномер с краном 12 т', cap: 12, len: 12, crane: true, spec: 'Площадка 12 м, стрела 5 т, вылет 16 м', price: [15000, 19500, 26000] }
  ];

  var ZONES = [
    { label: 'До 40 км', cut: 720, towns: [['Всеволожск', 0], ['Колтуши', 8], ['Янино', 10], ['Кудрово', 15], ['Мурино', 17], ['Токсово', 22], ['Сертолово', 30], ['Кировск', 35], ['Отрадное', 38], ['Шлиссельбург', 40]] },
    { label: '40–80 км', cut: 720, towns: [['Колпино', 42], ['Мга', 45], ['Никольское', 48], ['Сосново', 62], ['Тосно', 66], ['Гатчина', 78]] },
    { label: '80–150 км', cut: 600, towns: [['Зеленогорск', 85], ['Волхов', 115], ['Сосновый Бор', 115], ['Приозерск', 125], ['Кириши', 125], ['Выборг', 150], ['Луга', 150], ['Кингисепп', 150]] },
    { label: 'Дальше 150 км', cut: -1, towns: [['Светогорск', 200], ['Тихвин', 200], ['Бокситогорск', 240], ['Лодейное Поле', 245], ['Подпорожье', 290]] }
  ];

  var sel = $('to');
  ZONES.forEach(function (z, zi) {
    var g = document.createElement('optgroup');
    g.label = z.label;
    z.towns.forEach(function (t) {
      var o = document.createElement('option');
      o.value = zi + '|' + t[0];
      o.textContent = t[0] + (t[1] ? ', ' + t[1] + ' км' : ', база');
      if (t[0] === 'Мурино') o.selected = true;
      g.appendChild(o);
    });
    sel.appendChild(g);
  });

  var w = $('w'), l = $('l');
  var state = { w: 2, l: 1.2, crane: true, zone: 0, town: 'Мурино' };

  function paintRange(inp) {
    var p = (inp.value - inp.min) / (inp.max - inp.min) * 100;
    inp.style.setProperty('--p', p + '%');
  }

  function toGenitive(town) {
    var map = { 'Всеволожск': 'Всеволожска', 'Колтуши': 'Колтушей', 'Янино': 'Янино', 'Кудрово': 'Кудрово', 'Мурино': 'Мурино', 'Токсово': 'Токсово', 'Сертолово': 'Сертолово', 'Кировск': 'Кировска', 'Отрадное': 'Отрадного', 'Шлиссельбург': 'Шлиссельбурга', 'Колпино': 'Колпино', 'Мга': 'Мги', 'Никольское': 'Никольского', 'Сосново': 'Сосново', 'Тосно': 'Тосно', 'Гатчина': 'Гатчины', 'Зеленогорск': 'Зеленогорска', 'Волхов': 'Волхова', 'Сосновый Бор': 'Соснового Бора', 'Приозерск': 'Приозерска', 'Кириши': 'Киришей', 'Выборг': 'Выборга', 'Луга': 'Луги', 'Кингисепп': 'Кингисеппа', 'Светогорск': 'Светогорска', 'Тихвин': 'Тихвина', 'Бокситогорск': 'Бокситогорска', 'Лодейное Поле': 'Лодейного Поля', 'Подпорожье': 'Подпорожья' };
    return map[town] || town;
  }

  function plural(n, one, few, many) {
    var a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
    return many;
  }

  var pick = null, trips = 1;

  function calc() {
    var s = state, zi = Math.min(s.zone, 2), far = s.zone === 3;
    var fits = TRUCKS.filter(function (t) { return t.len >= s.l && t.cap >= s.w && (!s.crane || t.crane); });
    var note = '';
    trips = 1;
    pick = null;

    if (fits.length) {
      fits.sort(function (a, b) { return a.price[zi] - b.price[zi]; });
      pick = fits[0];
    } else if (s.crane && s.l > 12) {
      pick = TRUCKS[2];
      note = 'Груз длиннее 12 м краном не разгрузим: нужна ваша техника или руки. Привезём длинномером.';
    } else {
      // Не влезает по весу: несколько рейсов самой подходящей машиной
      var pool = TRUCKS.filter(function (t) { return t.len >= s.l && (!s.crane || t.crane); });
      pool.sort(function (a, b) { return (Math.ceil(s.w / a.cap) * a.price[zi]) - (Math.ceil(s.w / b.cap) * b.price[zi]); });
      pick = pool[0];
      trips = Math.ceil(s.w / pick.cap);
    }

    // Строки парка
    document.querySelectorAll('.truck').forEach(function (el) {
      var t = TRUCKS.filter(function (x) { return x.id === el.getAttribute('data-id'); })[0];
      var why = el.querySelector('.truck__why');
      el.classList.remove('is-pick', 'is-no');
      var reasons = [];
      if (t.len < s.l) reasons.push('кузов короче груза');
      if (t.cap < s.w && t !== pick) reasons.push('не хватает ' + fmt(+(s.w - t.cap).toFixed(1)) + ' т');
      if (s.crane && !t.crane) reasons.push('без крана');
      if (t === pick) {
        el.classList.add('is-pick');
        why.textContent = trips > 1 ? 'Поедет, ' + trips + ' ' + plural(trips, 'рейс', 'рейса', 'рейсов') : 'Поедет эта';
      } else if (reasons.length) {
        el.classList.add('is-no');
        why.textContent = 'Не подходит: ' + reasons.join(', ');
      } else {
        var diff = t.price[zi] - pick.price[zi] * trips;
        why.textContent = (far || diff <= 0) ? 'Тоже подойдёт' : 'Тоже подойдёт, дороже на ' + rub(diff);
      }
    });

    // Результат
    $('r-pre').textContent = trips > 1 ? 'Одной машиной не увезти. Поедет' : 'Поедет';
    $('r-truck').textContent = (trips > 1 ? trips + ' × ' : '') + pick.name;
    $('r-spec').textContent = pick.spec;
    if (far) {
      $('r-price').textContent = 'По адресу';
      $('r-per').textContent = 'до ' + toGenitive(s.town) + ' цену рейса назовёт диспетчер';
    } else {
      $('r-price').textContent = rub(pick.price[zi] * trips);
      $('r-per').textContent = (trips > 1 ? 'за ' + trips + ' ' + plural(trips, 'рейс', 'рейса', 'рейсов') : 'за рейс') + (s.zone === 0 && s.town === 'Всеволожск' ? ' по Всеволожску' : ' до ' + toGenitive(s.town));
    }

    var t = nowMinutes(), cut = ZONES[s.zone].cut, when;
    if (far) when = 'На следующий день после заказа';
    else if (t < cut) when = 'Сегодня, если закажете до ' + clock(cut);
    else when = 'Завтра. На сегодня отсечка была в ' + clock(cut);
    $('r-when').textContent = when;

    if (!note && s.crane && s.w <= 2 && !far && trips === 1) {
      note = 'Одну-две паллеты можем взять попутным рейсом, от 3 500 ₽. Спросите диспетчера, есть ли машина в вашу сторону.';
    }
    var n = $('r-note');
    n.textContent = note; n.hidden = !note;

    // Груз на линейке
    $('fleet').style.setProperty('--cl', Math.min(s.l, 14));
    $('cargo-l').textContent = fmt(s.l) + ' м';
  }

  function sync() {
    state.w = +w.value; state.l = +l.value;
    $('w-out').textContent = fmt(state.w) + ' т';
    $('l-out').textContent = fmt(state.l) + ' м';
    paintRange(w); paintRange(l);
    calc();
  }

  function clearChips() { document.querySelectorAll('.chip').forEach(function (c) { c.setAttribute('aria-pressed', 'false'); }); }

  w.addEventListener('input', function () { clearChips(); sync(); });
  l.addEventListener('input', function () { clearChips(); sync(); });
  document.querySelectorAll('input[name="crane"]').forEach(function (r) {
    r.addEventListener('change', function () { state.crane = r.value === '1'; clearChips(); calc(); });
  });
  sel.addEventListener('change', function () {
    var v = sel.value.split('|'); state.zone = +v[0]; state.town = v[1]; calc();
  });
  document.querySelectorAll('.chip').forEach(function (c) {
    c.setAttribute('aria-pressed', 'false');
    c.addEventListener('click', function () {
      clearChips(); c.setAttribute('aria-pressed', 'true');
      w.value = c.getAttribute('data-w'); l.value = c.getAttribute('data-l');
      var cr = c.getAttribute('data-c') === '1';
      document.querySelector('input[name="crane"][value="' + (cr ? 1 : 0) + '"]').checked = true;
      state.crane = cr;
      sync();
    });
  });

  $('r-order').addEventListener('click', function () {
    var s = state;
    $('f-to').value = s.town;
    $('f-what').value = (trips > 1 ? trips + ' × ' : '') + pick.name.replace(/ /g, ' ') + '. Груз около ' + fmt(s.w) + ' т, длина до ' + fmt(s.l) + ' м, ' + (s.crane ? 'разгрузка нашим краном' : 'разгружаем сами');
    setTimeout(function () { $('f-phone').focus({ preventScroll: true }); }, 400);
  });

  /* ---------- Контакты: честно говорим, что это демо ---------- */
  var toast = $('toast'), tt;
  var what = { call: 'звонок', tg: 'чат в Telegram', wa: 'чат в WhatsApp' };
  document.querySelectorAll('.js-contact').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      toast.textContent = 'Это демо, номер и мессенджеры вымышленные. На настоящем сайте здесь открылся бы ' + what[a.getAttribute('data-kind')] + '.';
      toast.hidden = false;
      clearTimeout(tt);
      tt = setTimeout(function () { toast.hidden = true; }, 4500);
    });
  });

  /* ---------- Форма ---------- */
  var form = $('form'), done = $('done');
  function setErr(inp, err, bad) {
    inp.setAttribute('aria-invalid', bad ? 'true' : 'false');
    err.hidden = !bad;
  }
  function phoneOk(v) {
    var d = v.replace(/\D/g, '');
    return (d.length === 11 && /^[78]/.test(d)) || d.length === 10;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var p = $('f-phone'), to = $('f-to');
    var pb = !phoneOk(p.value), tb = to.value.trim().length < 2;
    setErr(p, $('f-phone-err'), pb);
    setErr(to, $('f-to-err'), tb);
    if (pb) { p.focus(); return; }
    if (tb) { to.focus(); return; }
    $('done-phone').textContent = p.value.trim();
    form.hidden = true; done.hidden = false; done.focus();
  });
  ['f-phone', 'f-to'].forEach(function (id) {
    $(id).addEventListener('input', function () {
      if ($(id).getAttribute('aria-invalid') === 'true') {
        var ok = id === 'f-phone' ? phoneOk($(id).value) : $(id).value.trim().length >= 2;
        if (ok) setErr($(id), $(id + '-err'), false);
      }
    });
  });
  $('again').addEventListener('click', function () { done.hidden = true; form.hidden = false; $('f-phone').focus(); });

  renderStatus();
  sync();
  setInterval(function () { renderStatus(); calc(); }, 30000);
})();

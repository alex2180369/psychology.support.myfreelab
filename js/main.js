// «Опора»: меню, появление блоков, отправка заявки в Google Таблицу.
(function () {
  'use strict';

  // ВСТАВЬТЕ сюда URL веб-приложения Apps Script (вид https://script.google.com/macros/s/.../exec).
  // Пока пусто: форма сообщит, что приём заявок не подключён.
  var SITE_CONFIG = {
    googleSheetsUrl: ''
  };

  document.documentElement.classList.remove('no-js');

  // Мобильное меню
  var burger = document.querySelector('.burger');
  var nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Плавное появление блоков
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Форма заявки
  var form = document.getElementById('lead-form');
  var statusEl = document.getElementById('form-status');
  if (!form) return;

  function setStatus(text, kind) {
    statusEl.textContent = text;
    statusEl.className = 'form__status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var data = Object.fromEntries(new FormData(form));

    // Ловушка для ботов: настоящий человек это поле не видит.
    if (data.website) { return; }

    var bad = false;
    ['name', 'contact'].forEach(function (n) {
      var el = form.elements[n];
      var ok = (data[n] || '').trim().length >= 2;
      el.classList.toggle('invalid', !ok);
      if (!ok) bad = true;
    });
    if (bad) { setStatus('Заполните имя и контакт для связи.', 'err'); return; }

    if (!SITE_CONFIG.googleSheetsUrl) {
      setStatus('Приём заявок ещё не подключён. Напишите нам в Telegram.', 'err');
      return;
    }

    var btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    setStatus('Отправляю…');

    var now = new Date();
    var payload = {
      site: 'psy.myfreelab.ru',
      name: data.name.trim(),
      contact: data.contact.trim(),
      topic: data.topic || '',
      comment: (data.comment || '').trim(),
      page: window.location.href,
      submittedAtLocal: now.toLocaleString('ru-RU')
    };

    // text/plain, чтобы браузер не делал предварительный CORS-запрос: Apps Script его не обрабатывает.
    fetch(SITE_CONFIG.googleSheetsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      form.reset();
      setStatus('Спасибо! Заявка отправлена, мы свяжемся с вами.', 'ok');
    }).catch(function () {
      setStatus('Не получилось отправить. Напишите нам в Telegram.', 'err');
    }).finally(function () {
      btn.disabled = false;
    });
  });
})();

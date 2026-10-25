/**
 * Приём заявок с сайта «Опора» в Google Таблицу.
 * Дополнительно (по желанию) присылает копию заявки в Telegram.
 *
 * Установка:
 * 1. sheets.google.com -> создайте таблицу, назовите, например, «Опора: заявки».
 * 2. Расширения -> Apps Script. Удалите всё в редакторе и вставьте этот файл целиком.
 * 3. Сохраните. Нажмите «Развернуть» -> «Новое развёртывание».
 *    Тип: «Веб-приложение». Кто выполняет: «Мне». Доступ: «Все». Разрешите доступ.
 * 4. Скопируйте URL вида https://script.google.com/macros/s/.../exec
 *    и вставьте его в js/main.js, в SITE_CONFIG.googleSheetsUrl.
 *
 * Уведомления в Telegram (необязательно, токен НЕ хранится на сайте):
 *  Apps Script -> Настройки проекта (шестерёнка) -> «Свойства скрипта» -> добавьте
 *  TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID. Если свойств нет, уведомления отключены.
 *
 * Как забирать заявки: открывайте таблицу, лист «Заявки». Можно настроить фильтры,
 * скачать CSV (Файл -> Скачать) или подписаться на уведомления
 * (Инструменты -> Правила уведомлений).
 *
 * Заявки содержат личные данные: не открывайте таблицу посторонним.
 */

var SHEET_NAME = 'Заявки';
var HEADERS = ['Время', 'Сайт', 'Имя', 'Контакт', 'Запрос', 'Комментарий', 'Страница'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);
  try {
    var data = JSON.parse(e.postData.contents);

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      sheet.appendRow(HEADERS);
      sheet.setFrozenRows(1);
    }

    sheet.appendRow([
      clean_(data.submittedAtLocal) || new Date().toLocaleString('ru-RU'),
      clean_(data.site),
      clean_(data.name),
      clean_(data.contact),
      clean_(data.topic),
      clean_(data.comment),
      clean_(data.page)
    ]);

    notifyTelegram_(data);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, message: 'Заявки принимаются методом POST' });
}

// Защита от формул: значение, начинающееся с = + - @, превращаем в обычный текст.
function clean_(v) {
  var s = String(v == null ? '' : v).slice(0, 1000);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function notifyTelegram_(data) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) return;

  var text = [
    'Новая заявка: ' + (data.site || 'сайт'),
    'Имя: ' + (data.name || '-'),
    'Контакт: ' + (data.contact || '-'),
    'Запрос: ' + (data.topic || '-'),
    'Комментарий: ' + (data.comment || '-')
  ].join('\n');

  try {
    UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify({ chat_id: chatId, text: text }),
      muteHttpExceptions: true
    });
  } catch (e) {
    // Сбой уведомления не должен ломать запись в таблицу.
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

const SPREADSHEET_ID = '1hhvEM7c2QVxjX7JiIQQI90vvc-bdY1_UOIaCcOo-B5Q';
const SHEET_NAME = 'inquiries';
const ADMIN_EMAIL = 'kaki2019g@gmail.com';
const REPLY_FROM_NAME = 'bo-autobot';
const REPLY_SUBJECT = '【受付完了】お問い合わせありがとうございます（受付番号: {id}）';
const TIMEZONE = 'Asia/Tokyo';

const REQUIRED_FIELDS = ['your-name', 'your-email', 'your-subject', 'your-message'];

function doPost(e) {
  try {
    const params = (e && e.parameter) ? e.parameter : {};
    const missing = REQUIRED_FIELDS.filter(function(key) {
      return !params[key];
    });

    if (missing.length > 0) {
      return jsonResponse_({ ok: false, error: 'missing_fields', fields: missing });
    }

    const now = new Date();
    const receiptId = generateReceiptId_(now);

    const sheet = getSheet_();
    sheet.appendRow([
      receiptId,
      formatDate_(now),
      params['your-name'] || '',
      params['your-email'] || '',
      params['your-subject'] || '',
      params['your-message'] || '',
      '未対応',
      '',
      formatDate_(now)
    ]);

    sendAutoReply_(params, receiptId);
    notifyAdmin_(params, receiptId);

    return jsonResponse_({ ok: true, id: receiptId });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      '受付番号',
      '受付日時',
      '氏名',
      'メール',
      '件名',
      '本文',
      '状態',
      '対応者',
      '最終更新'
    ]);
  }
  return sheet;
}

function generateReceiptId_(date) {
  const y = Utilities.formatDate(date, TIMEZONE, 'yyyy');
  const m = Utilities.formatDate(date, TIMEZONE, 'MM');
  const d = Utilities.formatDate(date, TIMEZONE, 'dd');
  const hh = Utilities.formatDate(date, TIMEZONE, 'HH');
  const mm = Utilities.formatDate(date, TIMEZONE, 'mm');
  const ss = Utilities.formatDate(date, TIMEZONE, 'ss');
  const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return y + m + d + '-' + hh + mm + ss + '-' + rand;
}

function formatDate_(date) {
  return Utilities.formatDate(date, TIMEZONE, 'yyyy/MM/dd HH:mm:ss');
}

function sendAutoReply_(params, receiptId) {
  const to = params['your-email'] || '';
  if (!to) {
    return;
  }

  const subject = REPLY_SUBJECT.replace('{id}', receiptId);
  const body = [
    (params['your-name'] || '') + ' 様',
    '',
    'お問い合わせありがとうございます。以下の内容で受け付けました。',
    '受付番号: ' + receiptId,
    '返信目安: 3日以内（24時間・土日も対応）',
    '',
    '--- 受付内容 ---',
    'お名前: ' + (params['your-name'] || ''),
    'メール: ' + (params['your-email'] || ''),
    'お問い合わせ内容: ' + (params['your-subject'] || ''),
    'お問い合わせ詳細:',
    (params['your-message'] || ''),
    '----------------',
    ''
  ].join('\n');

  MailApp.sendEmail({
    to: to,
    subject: subject,
    name: REPLY_FROM_NAME,
    body: body
  });
}

function notifyAdmin_(params, receiptId) {
  if (!ADMIN_EMAIL) {
    return;
  }

  const subject = '【新規お問い合わせ】受付番号: ' + receiptId;
  const body = [
    '新しいお問い合わせが届きました。',
    '受付番号: ' + receiptId,
    '',
    'お名前: ' + (params['your-name'] || ''),
    'メール: ' + (params['your-email'] || ''),
    'お問い合わせ内容: ' + (params['your-subject'] || ''),
    'お問い合わせ詳細:',
    (params['your-message'] || '')
  ].join('\n');

  MailApp.sendEmail({
    to: ADMIN_EMAIL,
    subject: subject,
    body: body
  });
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

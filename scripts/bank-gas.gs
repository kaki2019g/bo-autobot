function doPost(e) {
  try {
    var body = normalizePayload_(e);

    if (body.action && body.action !== "create_order") {
      return jsonResponse_({ ok: false, error: "invalid_action" });
    }
    if (!body.payment_method) {
      return jsonResponse_({ ok: false, error: "missing_payment_method" });
    }
    if (body.payment_method !== "bank_transfer") {
      return jsonResponse_({ ok: false, error: "invalid_payment_method" });
    }

    validateOrderPayload_(body);
    var config = getConfig_();

    var orderId = Utilities.getUuid();
    var now = new Date();

    appendOrder_(config, {
      order_id: orderId,
      paypal_order_id: "",
      status: "pending_bank_transfer",
      payment_method: "bank_transfer",
      product_id: body.product_id,
      product_name: body.product_name,
      amount: body.amount,
      currency: body.currency,
      customer_name: body.customer.last_name + " " + body.customer.first_name,
      customer_email: body.customer.email,
      notes: body.customer.notes || "",
      created_at: now,
      updated_at: now
    });

    sendBankTransferEmail_(config, body.customer);

    return jsonResponse_({ ok: true, order_id: orderId });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function appendOrder_(config, data) {
  var sheet = getSheet_(config);
  var headers = [
    "order_id",
    "paypal_order_id",
    "status",
    "payment_method",
    "product_id",
    "product_name",
    "amount",
    "currency",
    "customer_name",
    "customer_email",
    "notes",
    "created_at",
    "updated_at"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }

  sheet.appendRow([
    data.order_id,
    data.paypal_order_id,
    data.status,
    data.payment_method,
    data.product_id,
    data.product_name,
    data.amount,
    data.currency,
    data.customer_name,
    data.customer_email,
    data.notes,
    data.created_at,
    data.updated_at
  ]);
}

function sendBankTransferEmail_(config, customer) {
  var subject = "【BO-AutoBot】銀行振込のご案内";
  var body = customer.last_name + " " + customer.first_name + " 様\n\n" +
    "ご注文ありがとうございます。以下の口座へお振込をお願いいたします。\n\n" +
    "銀行名：" + config.BANK_NAME + "\n" +
    "支店名：" + config.BANK_BRANCH + "\n" +
    "口座種別：" + config.BANK_TYPE + "\n" +
    "口座番号：" + config.BANK_NUMBER + "\n" +
    "口座名義：" + config.BANK_HOLDER + "\n\n" +
    "お振込は原則3日以内にお手続きいただけますと幸いです。\n" +
    "お振込の確認後、入力いただいたメールアドレス宛にダウンロードリンクを記載したメールをお送りいたします。\n" +
    "お振込確認は毎日行っておりますが、確認のタイミングによってはご連絡が遅れる場合がございます。\n" +
    "公式LINEにてお振込のご連絡をいただけますと、確認がスムーズです。\n\n" +
    "ご入金確認後、商品をお送りいたします。";
  GmailApp.sendEmail(customer.email, subject, body);
}

function getSheet_(config) {
  var ss = SpreadsheetApp.openById(config.SHEET_ID);
  return ss.getSheetByName(config.SHEET_NAME);
}

function validateOrderPayload_(payload) {
  if (!payload || !payload.customer) {
    throw new Error("invalid_payload");
  }
  if (!payload.customer.first_name || !payload.customer.last_name || !payload.customer.email) {
    throw new Error("missing_customer");
  }
}

function normalizePayload_(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  if (params && params.action) {
    return {
      action: params.action,
      product_id: params.product_id,
      product_name: params.product_name,
      amount: Number(params.amount),
      currency: params.currency,
      payment_method: params.payment_method,
      customer: {
        first_name: params.billing_first_name || "",
        last_name: params.billing_last_name || "",
        email: params.billing_email || "",
        notes: params.order_comments || ""
      }
    };
  }

  var body = {};
  if (e && e.postData && e.postData.contents) {
    try {
      body = JSON.parse(e.postData.contents);
    } catch (err) {
      body = {};
    }
  }
  return body;
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    SHEET_ID: props.getProperty("SHEET_ID"),
    SHEET_NAME: props.getProperty("SHEET_NAME") || "orders",
    BANK_NAME: props.getProperty("BANK_NAME"),
    BANK_BRANCH: props.getProperty("BANK_BRANCH"),
    BANK_TYPE: props.getProperty("BANK_TYPE"),
    BANK_NUMBER: props.getProperty("BANK_NUMBER"),
    BANK_HOLDER: props.getProperty("BANK_HOLDER")
  };
}

function jsonResponse_(data) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

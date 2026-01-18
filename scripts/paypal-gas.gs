function doPost(e) {
  Logger.log("params: %s", JSON.stringify(e && e.parameter ? e.parameter : {}));
  var body = normalizePayload_(e);

  var action = body.action || "";

  if (action === "create_order") {
    return handleCreateOrder_(body);
  }

  return handleWebhook_(e, body);
}

function handleCreateOrder_(payload) {
  var config = getConfig_();
  Logger.log("PAYMENT_DONE_URL: %s", config.PAYMENT_DONE_URL);
  validateOrderPayload_(payload);

  var orderId = Utilities.getUuid();
  var now = new Date();
  var paymentMethod = payload.payment_method;
  if (paymentMethod !== "paypal") {
    return htmlResponse_("このエンドポイントはPayPal決済専用です。");
  }
  var paypalOrderId = "";
  var approvalUrl = "";

  var paypalResponse = createPayPalOrder_(payload, orderId, config);
  paypalOrderId = paypalResponse.id;
  approvalUrl = extractApprovalUrl_(paypalResponse);
  Logger.log("PayPal order id: %s", paypalOrderId);
  Logger.log("PayPal approval url: %s", approvalUrl);

  appendOrder_(config, {
    order_id: orderId,
    paypal_order_id: paypalOrderId,
    status: "pending_payment",
    payment_method: "paypal",
    product_id: payload.product_id,
    product_name: payload.product_name,
    amount: payload.amount,
    currency: payload.currency,
    customer_name: payload.customer.last_name + " " + payload.customer.first_name,
    customer_email: payload.customer.email,
    notes: payload.customer.notes || "",
    created_at: now,
    updated_at: now
  });

  if (!approvalUrl) {
    return htmlResponse_("PayPalの決済URLを取得できませんでした。");
  }

  return redirectResponse_(approvalUrl);
}

function handleWebhook_(e, eventBody) {
  var config = getConfig_();
  var event = eventBody;

  if (!event || !event.event_type) {
    return jsonResponse_({ status: "ignored" });
  }

  if (!verifyWebhook_(e, event, config)) {
    return jsonResponse_({ status: "invalid" }, 400);
  }

  if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
    return jsonResponse_({ status: "received" });
  }

  var paypalOrderId = extractOrderIdFromEvent_(event);
  if (!paypalOrderId) {
    return jsonResponse_({ status: "missing_order_id" }, 400);
  }

  var order = updateOrderStatus_(config, paypalOrderId, "paid");
  if (order && order.customer_email) {
    sendProductEmail_(config, order.customer_email, order.customer_name);
  }

  return jsonResponse_({ status: "ok" });
}

function createPayPalOrder_(payload, orderId, config) {
  var accessToken = getPayPalAccessToken_(config);
  var url = getPayPalApiBase_(config) + "/v2/checkout/orders";
  var requestBody = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: payload.product_id,
        description: payload.product_name,
        custom_id: orderId,
        amount: {
          currency_code: payload.currency,
          value: String(payload.amount)
        }
      }
    ],
    application_context: {
      return_url: config.PAYPAL_RETURN_URL,
      cancel_url: config.PAYPAL_CANCEL_URL,
      brand_name: "BO-AutoBot",
      landing_page: "LOGIN",
      user_action: "PAY_NOW"
    }
  };

  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    payload: JSON.stringify(requestBody),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 400) {
    throw new Error("paypal_order_failed");
  }

  return JSON.parse(response.getContentText());
}

function extractApprovalUrl_(paypalResponse) {
  if (!paypalResponse || !paypalResponse.links) {
    return "";
  }
  for (var i = 0; i < paypalResponse.links.length; i++) {
    if (paypalResponse.links[i].rel === "approve") {
      return paypalResponse.links[i].href;
    }
  }
  return "";
}

function verifyWebhook_(e, event, config) {
  var headers = (e && e.headers) ? e.headers : null;
  if (!headers) {
    return false;
  }

  var payload = {
    auth_algo: getHeader_(headers, "paypal-auth-algo"),
    cert_url: getHeader_(headers, "paypal-cert-url"),
    transmission_id: getHeader_(headers, "paypal-transmission-id"),
    transmission_sig: getHeader_(headers, "paypal-transmission-sig"),
    transmission_time: getHeader_(headers, "paypal-transmission-time"),
    webhook_id: config.PAYPAL_WEBHOOK_ID,
    webhook_event: event
  };

  if (!payload.auth_algo || !payload.cert_url || !payload.transmission_id ||
      !payload.transmission_sig || !payload.transmission_time) {
    return false;
  }

  var accessToken = getPayPalAccessToken_(config);
  var url = getPayPalApiBase_(config) + "/v1/notifications/verify-webhook-signature";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + accessToken
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 400) {
    return false;
  }

  var result = JSON.parse(response.getContentText());
  return result.verification_status === "SUCCESS";
}

function getPayPalAccessToken_(config) {
  var url = getPayPalApiBase_(config) + "/v1/oauth2/token";
  var response = UrlFetchApp.fetch(url, {
    method: "post",
    headers: {
      Authorization: "Basic " + Utilities.base64Encode(config.PAYPAL_CLIENT_ID + ":" + config.PAYPAL_CLIENT_SECRET)
    },
    payload: {
      grant_type: "client_credentials"
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() >= 400) {
    throw new Error("paypal_token_failed");
  }

  return JSON.parse(response.getContentText()).access_token;
}

function getPayPalApiBase_(config) {
  return config.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

function extractOrderIdFromEvent_(event) {
  if (event.resource && event.resource.supplementary_data &&
      event.resource.supplementary_data.related_ids &&
      event.resource.supplementary_data.related_ids.order_id) {
    return event.resource.supplementary_data.related_ids.order_id;
  }
  return "";
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

function updateOrderStatus_(config, paypalOrderId, status) {
  var sheet = getSheet_(config);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return null;
  }

  var header = values[0];
  var paypalIndex = header.indexOf("paypal_order_id");
  var statusIndex = header.indexOf("status");
  var updatedIndex = header.indexOf("updated_at");
  var emailIndex = header.indexOf("customer_email");
  var nameIndex = header.indexOf("customer_name");

  for (var i = 1; i < values.length; i++) {
    if (values[i][paypalIndex] === paypalOrderId) {
      sheet.getRange(i + 1, statusIndex + 1).setValue(status);
      sheet.getRange(i + 1, updatedIndex + 1).setValue(new Date());
      return {
        customer_email: values[i][emailIndex],
        customer_name: values[i][nameIndex]
      };
    }
  }
  return null;
}

function sendProductEmail_(config, email, name) {
  var subject = "【BO-AutoBot】商品送付のご案内";
  var body = name + " 様\n\n" +
    "BO-AutoBotのご購入ありがとうございます。\n" +
    "以下より商品をお受け取りください。\n\n" +
    "ダウンロードURL：\n" + config.PRODUCT_DOWNLOAD_URL + "\n\n" +
    "ご不明点がございましたらお問い合わせください。";
  GmailApp.sendEmail(email, subject, body);
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

function redirectResponse_(url) {
  if (!url) {
    return htmlResponse_("遷移先URLが設定されていません。");
  }
  var html = '<!doctype html><html><head><meta charset="UTF-8">' +
    '<meta http-equiv="refresh" content="0;URL=' + url + '">' +
    '<script>window.location.replace("' + url + '");</script>' +
    '</head><body>Redirecting...<br><a href="' + url + '">Continue</a></body></html>';
  return HtmlService.createHtmlOutput(html);
}

function htmlResponse_(message) {
  return HtmlService.createHtmlOutput('<!doctype html><html><body>' + message + '</body></html>');
}

function getHeader_(headers, name) {
  var lowerName = name.toLowerCase();
  for (var key in headers) {
    if (headers.hasOwnProperty(key) && key.toLowerCase() === lowerName) {
      return headers[key];
    }
  }
  return "";
}

function getConfig_() {
  var props = PropertiesService.getScriptProperties();
  return {
    SHEET_ID: props.getProperty("SHEET_ID"),
    SHEET_NAME: props.getProperty("SHEET_NAME") || "orders",
    PAYPAL_CLIENT_ID: props.getProperty("PAYPAL_CLIENT_ID"),
    PAYPAL_CLIENT_SECRET: props.getProperty("PAYPAL_CLIENT_SECRET"),
    PAYPAL_WEBHOOK_ID: props.getProperty("PAYPAL_WEBHOOK_ID"),
    PAYPAL_ENV: props.getProperty("PAYPAL_ENV") || "sandbox",
    PAYPAL_RETURN_URL: props.getProperty("PAYPAL_RETURN_URL"),
    PAYPAL_CANCEL_URL: props.getProperty("PAYPAL_CANCEL_URL"),
    PRODUCT_DOWNLOAD_URL: props.getProperty("PRODUCT_DOWNLOAD_URL") || "https://example.com/download"
  };
}

function jsonResponse_(data, statusCode) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

(() => {
  // キャンセル時に商品種別に応じて戻り先を調整する。
  const backLink = document.getElementById("paypal-cancel-link");
  if (backLink) {
    try {
      const raw = sessionStorage.getItem("paypalOrderData");
      const data = raw ? JSON.parse(raw) : null;
      if (data && data.product_id === "bo-autobot-demo") {
        // GitHub Pagesのベースパスを考慮して戻り先URLを解決する。
        const demoPath = "/checkout/checkout.html?product=demo";
        const demoUrl = typeof window.withBasePath === "function"
          ? window.withBasePath(demoPath)
          : new URL(demoPath, window.location.href).toString();
        backLink.setAttribute("href", demoUrl);
      }
    } catch (err) {
    }
  }

  // 共通設定の読み込み完了後に注文ステータスをキャンセルへ更新する。
  const params = new URLSearchParams(window.location.search);
  const paypalOrderId = params.get("token") || params.get("paypal_order_id") || "";
  if (!paypalOrderId || typeof window.getGasEndpoint !== "function") {
    return;
  }

  window.getGasEndpoint().then((endpoint) => {
    const payload = new URLSearchParams();
    payload.set("action", "cancel_paypal");
    payload.set("paypal_order_id", paypalOrderId);
    payload.set("source", "paypal_cancel");
    return fetch(endpoint, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"
      },
      body: payload.toString()
    });
  }).catch(() => {});
})();

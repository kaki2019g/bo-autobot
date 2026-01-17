(function() {
  var form = document.querySelector(".woocommerce-checkout");
  if (!form) {
    return;
  }

  var submitButton = document.getElementById("checkout-submit");
  var message = document.getElementById("checkout-message");
  var endpoint = form.getAttribute("data-gas-endpoint");

  function showMessage(text, isError) {
    if (!message) {
      return;
    }
    message.textContent = text;
    message.classList.toggle("is-error", !!isError);
  }

  function setLoading(isLoading) {
    if (!submitButton) {
      return;
    }
    submitButton.classList.toggle("is-loading", !!isLoading);
  }

  function getSelectedPayment() {
    var selected = form.querySelector('input[name="payment_method"]:checked');
    if (!selected) {
      return null;
    }
    return selected.id === "payment_method_bacs" ? "bank_transfer" : "paypal";
  }

  submitButton.addEventListener("click", function() {
    var paymentMethod = getSelectedPayment();
    var firstName = form.querySelector("#billing_first_name").value.trim();
    var lastName = form.querySelector("#billing_last_name").value.trim();
    var email = form.querySelector("#billing_email").value.trim();
    var notes = form.querySelector("#order_comments").value.trim();

    if (!endpoint || endpoint.indexOf("script.google.com") === -1) {
      showMessage("決済設定が未完了です。運営にお問い合わせください。", true);
      return;
    }

    if (!firstName || !lastName || !email) {
      showMessage("必須項目を入力してください。", true);
      return;
    }

    if (!paymentMethod) {
      showMessage("支払い方法を選択してください。", true);
      return;
    }

    setLoading(true);
    showMessage("");

    var payload = {
      action: "create_order",
      product_id: "bo-autobot",
      product_name: "BO-AutoBot",
      amount: 20000,
      currency: "JPY",
      payment_method: paymentMethod,
      customer: {
        first_name: firstName,
        last_name: lastName,
        email: email,
        notes: notes
      }
    };

    var params = new URLSearchParams();
    Object.keys(payload).forEach(function(key) {
      params.append(key, typeof payload[key] === "object" ? JSON.stringify(payload[key]) : payload[key]);
    });

    fetch(endpoint, {
      method: "POST",
      body: params
    })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        if (!data || data.status !== "ok") {
          throw new Error("failed");
        }
        if (paymentMethod === "paypal") {
          if (!data.approval_url) {
            throw new Error("missing_approval_url");
          }
          window.location.href = data.approval_url;
          return;
        }
        showMessage("ご注文を受け付けました。振込案内をメールでお送りします。", false);
      })
      .catch(function() {
        showMessage("送信に失敗しました。しばらくしてからお試しください。", true);
      })
      .finally(function() {
        setLoading(false);
      });
  });
})();

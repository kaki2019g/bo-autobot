(function() {
  var form = document.querySelector(".woocommerce-checkout");
  if (!form) {
    return;
  }

  var bankItem = form.querySelector(".payment_method_bacs");
  var bankInput = form.querySelector("#payment_method_bacs");
  var paypalInput = form.querySelector("#payment_method_card");
  var message = document.getElementById("checkout-message");
  var defaultPayment = form.getAttribute("data-default-payment");

  function showMessage(text, isError) {
    if (!message) {
      return;
    }
    message.textContent = text;
    message.classList.toggle("is-error", !!isError);
  }

  if (bankInput) {
    bankInput.disabled = false;
    bankInput.removeAttribute("aria-disabled");
    if (bankItem) {
      bankItem.classList.remove("is-disabled");
    }
    if (defaultPayment === "bank_transfer") {
      bankInput.checked = true;
    }
  }

  if (paypalInput && defaultPayment === "paypal") {
    paypalInput.checked = true;
  }

  form.addEventListener("submit", function(event) {
    var selected = form.querySelector('input[name="payment_method"]:checked');
    if (!selected) {
      showMessage("支払い方法を選択してください。", true);
      event.preventDefault();
      return;
    }

    if (selected.value !== "bank_transfer") {
      return;
    }

    if (!form.reportValidity()) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    var data = new FormData(form);
    var payload = {};
    data.forEach(function(value, key) {
      payload[key] = value;
    });
    payload.payment_method = "bank_transfer";

    try {
      sessionStorage.setItem("bankOrderData", JSON.stringify(payload));
    } catch (err) {
      showMessage("ブラウザの設定により銀行振込の確認画面へ進めません。", true);
      return;
    }

    showMessage("");
    window.location.href = new URL("payment-bank-confirm.html", window.location.href).toString();
  });
})();

(function() {
  var form = document.querySelector('form.wpcf7-form');
  if (!form) {
    return;
  }
  var confirmUrl = new URL('contact-confirm.html', window.location.href).toString();
  form.setAttribute('action', confirmUrl);
  form.addEventListener('submit', function(event) {
    if (!form.reportValidity()) {
      return;
    }
    event.preventDefault();
    var data = new FormData(form);
    var payload = {};
    data.forEach(function(value, key) {
      payload[key] = value;
    });
    try {
      sessionStorage.setItem('contactFormData', JSON.stringify(payload));
    } catch (err) {
      alert('ブラウザの設定により確認画面へ進めません。JavaScriptの設定をご確認ください。');
      return;
    }
    window.location.href = confirmUrl;
  });
})();

(function() {
  var doneUrl = new URL('contact-done.html', window.location.href).toString();
  var form = document.querySelector('form.wpcf7-form');
  if (!form) {
    return;
  }
  var error = document.getElementById('contact-error');
  var raw = null;
  var data = null;
  try {
    raw = sessionStorage.getItem('contactFormData');
    data = raw ? JSON.parse(raw) : null;
  } catch (err) {
    data = null;
  }
  var required = ['your-name', 'your-email', 'your-subject', 'your-message', 'agree-privacy'];
  var isValid = data && required.every(function(key) {
    return data[key];
  });
  var fields = ['your-name', 'your-email', 'your-subject', 'your-signal', 'your-message', 'agree-privacy', 'source'];
  fields.forEach(function(name) {
    var value = data && data[name] ? data[name] : '';
    if (name === 'source' && !value) {
      value = 'contact';
    }
    var cell = document.querySelector('[data-field="' + name + '"]');
    if (cell) {
      cell.textContent = value;
    }
    var input = document.querySelector('input[type="hidden"][name="' + name + '"]');
    if (input) {
      input.value = value;
    }
  });
  var backButton = document.getElementById('back-button');
  if (backButton) {
    backButton.addEventListener('click', function() {
      if (history.length > 1) {
        history.back();
      } else {
        window.location.href = new URL('contact.html', window.location.href).toString();
      }
    });
  }
  var signalRow = document.querySelector('[data-row="your-signal"]');
  if (signalRow && !(data && data['your-signal'])) {
    signalRow.style.display = 'none';
  }
  var submitButton = form.querySelector('button[type="submit"]');
  if (!isValid && submitButton) {
    submitButton.disabled = true;
  }
  if (!isValid && error) {
    error.textContent = '入力内容が見つかりませんでした。お問い合わせフォームからやり直してください。';
  }
  form.setAttribute('action', doneUrl);
  form.addEventListener('submit', function(event) {
    event.preventDefault();
    if (!isValid) {
      if (error) {
        error.textContent = '入力内容が見つかりませんでした。お問い合わせフォームからやり直してください。';
      }
      return;
    }
    if (form.dataset.submitting === 'true') {
      return;
    }
    form.dataset.submitting = 'true';
    var loading = document.getElementById('contact-loading');
    if (loading) {
      loading.style.display = 'block';
    }
    var buttons = form.querySelectorAll('.wpcf7-submit');
    buttons.forEach(function(button) {
      button.disabled = true;
    });
    var endpoint = form.getAttribute('data-gas-endpoint');
    if (!endpoint || endpoint.indexOf('script.google.com') === -1) {
      if (error) {
        error.textContent = '送信先の設定が未完了です。お手数ですがお問い合わせください。';
      }
      form.dataset.submitting = 'false';
      if (loading) {
        loading.style.display = 'none';
      }
      buttons.forEach(function(button) {
        button.disabled = false;
      });
      return;
    }
    var payload = new URLSearchParams(new FormData(form));
    fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: payload.toString()
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('Request failed');
      }
      return response.json();
    }).then(function() {
      try {
        sessionStorage.removeItem('contactFormData');
      } catch (err) {
      }
      window.location.href = doneUrl;
    }).catch(function() {
      alert('送信に失敗しました。時間をおいて再度お試しください。');
      form.dataset.submitting = 'false';
      if (loading) {
        loading.style.display = 'none';
      }
      buttons.forEach(function(button) {
        button.disabled = false;
      });
    });
  });
})();

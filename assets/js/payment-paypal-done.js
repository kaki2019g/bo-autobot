(function() {
  // 共通設定の読み込み完了後にPayPal決済を確定する。
  var main = document.getElementById('l-main');
  if (!main) {
    return;
  }
  var params = new URLSearchParams(window.location.search);
  var token = params.get('token');
  if (!token) {
    return;
  }
  var message = document.getElementById('paypal-capture-message');
  if (message) {
    message.textContent = '決済の確認中です…';
  }
  var payload = new URLSearchParams();
  payload.set('action', 'capture_paypal');
  payload.set('token', token);
  var endpointPromise = typeof window.getGasEndpoint === 'function'
    ? window.getGasEndpoint()
    : Promise.reject(new Error('invalid_endpoint'));
  endpointPromise.then(function(endpoint) {
    return fetch(endpoint, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: payload.toString()
    });
  }).then(function(response) {
    if (!response.ok) {
      throw new Error('Request failed');
    }
    return response.json();
  }).then(function(data) {
    if (!data || !data.ok) {
      throw new Error('Request failed');
    }
    if (message) {
      message.textContent = '決済が完了しました。メールを送信しました。';
    }
  }).catch(function() {
    if (message) {
      message.textContent = '決済の確認に失敗しました。時間をおいて再度お試しください。';
    }
  });
})();

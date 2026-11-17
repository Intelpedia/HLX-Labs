const order = new URLSearchParams(location.search).get('order');
const message = document.querySelector('#paymentStatus');
const button = document.querySelector('#checkPayment');
async function checkPayment() {
  button.disabled = true;
  try {
    const token = localStorage.getItem('hlxCleffoOrder:' + order);
    if (!order || !token) {
      message.textContent = 'Open this page in the browser you used for checkout, or contact support with your payment reference.';
      return;
    }
    const response = await fetch('https://ttmwcwuzrqemsqfwkkyw.supabase.co/functions/v1/cleffo-payments/status', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_number: order, access_token: token })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Payment status is temporarily unavailable.');
    if (result.payment_state === 'test_completed') {
      message.textContent = 'Test payment confirmed. Order reference ' + order + '. Supplier test status ' + result.fulfillment_state.replaceAll('_', ' ') + '.';
    } else if (result.payment_state === 'completed') {
      message.textContent = 'Payment confirmed. Your order reference is ' + order + '.';
    } else if (result.payment_state === 'failed') {
      message.textContent = 'The payment was unsuccessful. Return to your cart or contact support.';
    } else {
      message.textContent = 'Payment has not been confirmed yet. Please check again shortly. Your order reference is ' + order + '.';
    }
  } catch (error) {
    message.textContent = error.message || 'Payment status is temporarily unavailable.';
  } finally { button.disabled = false; }
}
button.addEventListener('click', checkPayment);
checkPayment();

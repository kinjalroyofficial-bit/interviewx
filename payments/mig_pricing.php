<!DOCTYPE html>
<html>
<head>
  <title>Plans & Pricing</title>
  <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>
<body style="margin:0;font-family:Arial,sans-serif;background-color:#fff;color:#111;">
<div style="text-align:center;padding:24px 10px;">
  <h1 style="font-size:34px;margin-bottom:9px;">Plans & Pricing</h1>
  <span style="font-size:13px;color:#777;">*18% GST applicable. Final price will include GST.</span>
</div>
<div style="display:flex;justify-content:center;gap:30px;flex-wrap:wrap;padding:20px;">
  <div style="border:1px solid #ccc;border-radius:8px;padding:30px 20px;width:280px;text-align:center;">
    <div style="font-size:18px;font-weight:bold;">Starter</div>
    <div style="font-size:26px;font-weight:bold;margin:20px 0;">₹1000</div>
    <button onclick="processPayment(event, {planId:'starter',planName:'Starter',basePrice:1000,creditsToAdd:1000})" style="background:#ffc107;border:none;padding:10px 20px;border-radius:20px;font-weight:bold;cursor:pointer;">BUY STARTER</button>
  </div>
  <div style="border:1px solid #ccc;border-radius:8px;padding:30px 20px;width:280px;text-align:center;">
    <div style="font-size:18px;font-weight:bold;">Standard</div>
    <div style="font-size:26px;font-weight:bold;margin:20px 0;">₹2000</div>
    <button onclick="processPayment(event, {planId:'standard',planName:'Standard',basePrice:2000,creditsToAdd:2000})" style="background:#ffc107;border:none;padding:10px 20px;border-radius:20px;font-weight:bold;cursor:pointer;">BUY STANDARD</button>
  </div>
  <div style="border:1px solid #ccc;border-radius:8px;padding:30px 20px;width:280px;text-align:center;">
    <div style="font-size:18px;font-weight:bold;">Pro Mode</div>
    <div style="font-size:26px;font-weight:bold;margin:20px 0;">₹5000</div>
    <button onclick="processPayment(event, {planId:'pro_mode',planName:'Pro Mode',basePrice:5000,creditsToAdd:3000})" style="background:#ffc107;border:none;padding:10px 20px;border-radius:20px;font-weight:bold;cursor:pointer;">BUY PRO</button>
  </div>
</div>

<div style="text-align:center; margin-bottom:20px;">
  <div style="display:inline-flex; gap:8px; align-items:center;">
    <input id="couponCodeInput" type="text" placeholder="Enter Coupon Code" style="padding:10px 14px;border-radius:20px;border:1px solid #ccc;width:220px;font-size:14px;outline:none;" onblur="validateCoupon()"/>
    <button onclick="validateCoupon()" style="background:#65558F;color:#fff;border:none;padding:9px 16px;border-radius:20px;font-size:13px;cursor:pointer;font-weight:600;">Apply</button>
  </div>
  <div id="couponStatus" style="margin-top:2px;font-size:14px;"></div>
</div>

<script>
function initUser(data) {
  if (data.loggedin) {
    window.profile = { email: data.email, userID: data.userID }
  } else {
    window.profile = { email: 'guest@koviki.com', userID: 'guest' }
  }
}
</script>
<script src="https://interviewx.koviki.com/whoami_js?callback=initUser"></script>
<script>
let activeCoupon = null
let activeDiscount = 0

function validateCoupon() {
  const code = document.getElementById('couponCodeInput').value.trim()
  const statusEl = document.getElementById('couponStatus')
  if (!code) {
    activeCoupon = null
    activeDiscount = 0
    statusEl.innerHTML = ''
    return
  }
  fetch('https://koviki.com/payments/validate_coupon.php', {
    method: 'POST',
    headers: {'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({coupon:code})
  }).then(r=>r.json()).then(data => {
    if (data.status === 'valid') {
      activeCoupon = data.coupon_code
      activeDiscount = parseInt(data.discount_rate || '0', 10)
      statusEl.innerHTML = `<span style="color:#51c794;font-weight:600;">✓ Coupon Applied (${activeDiscount}% OFF)</span>`
    } else {
      activeCoupon = null
      activeDiscount = 0
      statusEl.innerHTML = '<span style="color:red;">Invalid/Expired coupon</span>'
    }
  }).catch(() => {
    statusEl.innerHTML = '<span style="color:red;">Coupon check failed</span>'
  })
}

function processPayment(event, plan) {
  event.preventDefault()
  const discountAmount = Math.round(plan.basePrice * (activeDiscount / 100))
  const discountedBase = plan.basePrice - discountAmount
  const gstAmount = Math.round(discountedBase * 0.18)
  const netAmount = discountedBase + gstAmount

  Swal.fire({
    title: 'Confirm Payment',
    width: 420,
    confirmButtonText: 'Proceed to Pay',
    showCancelButton: true,
    cancelButtonText: 'Cancel',
    html: `<div style="text-align:left;font-size:14px">Plan: <b>${plan.planName}</b><br>Base: ₹${plan.basePrice}<br>Discount: -₹${discountAmount}<br>GST: ₹${gstAmount}<br><b>Total: ₹${netAmount}</b></div>`
  }).then(result => {
    if (!result.isConfirmed) return

    const purchaseSummary = [{
      id: plan.planId,
      name: plan.planName,
      price: netAmount,
      base_price: plan.basePrice,
      gst: gstAmount,
      discount: discountAmount,
      credits_to_add: plan.creditsToAdd,
      quantity: 1,
      coupon: activeCoupon || '',
      discount_rate: activeDiscount || 0
    }]

    const email = window.profile?.email || 'guest@koviki.com'
    const userId = window.profile?.userID || 'guest'
    const customerDetails = { email, userId }

    fetch('https://koviki.com/payments/interviewx_backend.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        IsPurchase: 'true',
        customerDetails: JSON.stringify(customerDetails),
        purchaseSummary: JSON.stringify(purchaseSummary),
        couponCode: activeCoupon || '',
        discount_rate: activeDiscount || 0
      })
    })
    .then(async (res) => {
      const text = await res.text()
      let data = {}
      try { data = text ? JSON.parse(text) : {} } catch { throw new Error('Payment endpoint returned HTML/non-JSON') }
      if (data.status === 'success' && data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.message || 'Unknown payment error')
      }
    })
    .catch(err => {
      console.error('Payment error:', err)
      alert('Payment failed: ' + err.message)
    })
  })
}
</script>
</body>
</html>

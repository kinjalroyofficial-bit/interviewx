# PhonePe QR/UPI “Weird QR” Verification Checklist

Use this checklist when the PhonePe payment page opens but the QR code appears faint/invalid or scanner apps fail to detect it.

## 1) Environment and credentials

- [ ] `PHONEPE_BASE_URL` is correct for the environment you are using (UAT vs production).
- [ ] `PHONEPE_MERCHANT_ID` is the exact merchant id mapped to the same PhonePe account/environment.
- [ ] `PHONEPE_API_KEY` matches the same merchant/environment pair.
- [ ] `PHONEPE_SALT_INDEX` matches the key currently active in PhonePe for that merchant.
- [ ] No stale values are being loaded from old `.env` files or deployment secrets.

## 2) X-VERIFY signature correctness (must match exactly)

### Create Payment (`/pg/v1/pay`)

- [ ] Base64 payload is generated from the exact JSON request body sent to PhonePe.
- [ ] Signature input string is exactly: `<base64_payload>/pg/v1/pay<api_key>`
- [ ] SHA256 is computed over that exact string.
- [ ] Header is exactly: `X-VERIFY: <sha256>###<salt_index>`
- [ ] Request body is sent as raw JSON: `{ "request": "<base64_payload>" }`
- [ ] `Content-Type: application/json` and `accept: application/json` are present.

### Status Check (`/pg/v1/status/{merchantId}/{mtid}`)

- [ ] Signature input string is exactly: `/pg/v1/status/{merchantId}/{mtid}<api_key>`
- [ ] Header includes both `X-VERIFY` and `X-MERCHANT-ID: <merchantId>`.

## 3) Request payload values used to generate QR

- [ ] `merchantId` equals configured merchant id.
- [ ] `merchantTransactionId` is unique for each attempt.
- [ ] `merchantUserId` is non-empty and stable for the user.
- [ ] `amount` is in paise and is `> 0`.
- [ ] `redirectUrl` is valid and publicly reachable by browser.
- [ ] `redirectMode` is set to `POST` (or as required by your integration).
- [ ] `callbackUrl` is valid if provided (even if callback is not operationally used).
- [ ] `paymentInstrument.type` is `PAY_PAGE`.

## 4) Response sanity checks from PhonePe pay API

- [ ] HTTP status is 2xx.
- [ ] JSON has `success: true`.
- [ ] JSON has `data.instrumentResponse.redirectInfo.url`.
- [ ] If `success: false`, record `code` and `message` and stop before redirect.

## 5) Browser/UI checks for “QR looks weird” symptoms

- [ ] Open payment page in an incognito window.
- [ ] Disable browser extensions (ad blocker/privacy/corporate plug-ins).
- [ ] Try another network (office firewalls can block QR assets/scripts).
- [ ] Confirm system time is correct (large clock skew can break session state).
- [ ] Verify that page is loaded over HTTPS and no mixed-content warnings appear.
- [ ] Check browser console/network for blocked JS/CSS/image resources.

## 6) Amount and pricing consistency checks

- [ ] Amount shown on PhonePe equals backend `amount_paise / 100`.
- [ ] Coupon and GST math are consistent with selected pricing mode.
- [ ] For legacy callers (`price`), ensure legacy pricing path is used.
- [ ] For current callers (`base_price`), ensure credits-based pricing path is used.

## 7) No-callback flow checks (your preferred flow)

- [ ] Redirect lands on `/payment-confirmation/page?mtid=<id>` or includes mtid in POST body.
- [ ] Backend status call is successful on confirmation page load.
- [ ] Credits are added only once (`payment_status` transitions to `CREDITED` once).
- [ ] Reopening confirmation page does not duplicate credits.

## 8) FastAPI code points to inspect quickly

- [ ] Env vars for merchant/base URL/salt are loaded.
- [ ] `build_phonepe_pay_x_verify` implementation.
- [ ] `build_phonepe_status_x_verify` implementation.
- [ ] `/create-payment` request body/headers and response handling.
- [ ] `/payment-confirmation` state handling and idempotent credit update.
- [ ] `/payment-debug/{mtid}` output for transaction metadata.

## 9) Minimal diagnostic bundle to capture for failed QR sessions

Collect these (with sensitive values masked):

1. `mtid`
2. `merchantId`
3. `amount_paise`
4. create-payment HTTP status
5. create-payment response `code`/`message`
6. redirect URL host/path (query redacted)
7. confirmation status-check response `state`, `code`, `message`
8. backend transaction snapshot from `/payment-debug/{mtid}`

---

## Quick interpretation guide

- QR renders but scanner cannot detect/pay: usually environment mismatch, stale key/salt index, or malformed pay payload/signature.
- Pay page opens but no valid instrument details: inspect create-payment `success/code/message` immediately.
- Payment completes but credits not added: inspect `/payment-confirmation` status call and `payment_status` transitions.

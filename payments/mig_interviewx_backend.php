<?php

declare(strict_types=1);

session_start();
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

require_once '../assets/php/config/config.php';
require_once __DIR__ . '/mig_payment_common.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    mig_json_response(['status' => 'error', 'message' => 'Invalid request method'], 405);
}

$customer = mig_decode_json_field('customerDetails');
$purchaseRaw = mig_decode_json_field('purchaseSummary');
$purchase = (isset($purchaseRaw[0]) && is_array($purchaseRaw[0])) ? $purchaseRaw[0] : $purchaseRaw;
if (!$customer || !$purchase) {
    mig_json_response(['status' => 'error', 'message' => 'Invalid customerDetails or purchaseSummary payload'], 400);
}

$userId = (string)($customer['userId'] ?? $customer['userID'] ?? 'guest');
$email = (string)($customer['email'] ?? '');
$planName = (string)($purchase['name'] ?? '');

$basePrice = (int)($purchase['base_price'] ?? $purchase['price'] ?? 0);
if ($basePrice <= 0) {
    mig_json_response(['status' => 'error', 'message' => 'Plan/base price missing or invalid'], 400);
}

$creditsToAdd = (int)($purchase['credits_to_add'] ?? 0);
if ($creditsToAdd <= 0) {
    // plan-aware fallback for legacy cards
    if ($basePrice === 5000) $creditsToAdd = 3000;
    elseif ($basePrice === 2000) $creditsToAdd = 2000;
    else $creditsToAdd = 1000;
}

$gstAmount = (int)($purchase['gst'] ?? round($basePrice * 0.18));
$amountBeforeDiscount = $basePrice + $gstAmount;
$couponCode = trim((string)($_POST['couponCode'] ?? ''));
$discountRate = (int)($purchase['discount_rate'] ?? 0);
$discountValue = (int)($purchase['discount'] ?? 0);
$amount = (int)($purchase['price'] ?? $amountBeforeDiscount);

if ($couponCode !== '') {
    $stmtCoupon = $mysql_db->prepare('SELECT discount_rate, max_usage, expiry FROM interviewx_coupons WHERE coupon_code = ? LIMIT 1');
    if ($stmtCoupon) {
        $stmtCoupon->bind_param('s', $couponCode);
        $stmtCoupon->execute();
        $res = $stmtCoupon->get_result();
        if ($res && $res->num_rows > 0) {
            $coupon = $res->fetch_assoc();
            $tmpRate = (int)($coupon['discount_rate'] ?? 0);
            $maxUsage = (int)($coupon['max_usage'] ?? 0);
            $expiry = (string)($coupon['expiry'] ?? '');
            $valid = $tmpRate > 0 && $maxUsage !== 0 && ($expiry === '' || $expiry >= date('Y-m-d'));
            if ($valid) {
                $discountRate = $tmpRate;
                $discountValue = (int)round(($amountBeforeDiscount * $discountRate) / 100);
                $amount = max(1, $amountBeforeDiscount - $discountValue);
            }
        }
        $stmtCoupon->close();
    }
}

$merchantTransactionId = uniqid('IXT', false);
$paymentData = [
    'merchantId' => MIG_PHONEPE_MERCHANT_ID,
    'merchantTransactionId' => $merchantTransactionId,
    'merchantUserId' => $userId,
    'amount' => $amount * 100,
    'redirectUrl' => MIG_PAYMENT_REDIRECT_URL . '?mtid=' . $merchantTransactionId,
    'redirectMode' => 'POST',
    'callbackUrl' => MIG_PAYMENT_CALLBACK_URL . '?mtid=' . $merchantTransactionId,
    'paymentInstrument' => ['type' => 'PAY_PAGE'],
];

$description = json_encode([
    'customer' => ['email' => $email, 'userId' => $userId],
    'purchase' => [
        'id' => (string)($purchase['id'] ?? ''),
        'name' => $planName,
        'base_price' => $basePrice,
        'gst' => $gstAmount,
        'gross' => $amountBeforeDiscount,
        'discount' => $discountValue,
        'final_price' => $amount,
        'credits_to_add' => $creditsToAdd,
        'coupon' => $couponCode,
        'discount_rate' => $discountRate,
    ],
], JSON_UNESCAPED_SLASHES);

$payloadMain = base64_encode((string)json_encode($paymentData));
$checksum = hash('sha256', $payloadMain . '/pg/v1/pay' . MIG_PHONEPE_API_KEY) . '###' . MIG_PHONEPE_SALT_INDEX;
$request = json_encode(['request' => $payloadMain]);

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => MIG_PHONEPE_PAY_URL,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => 'POST',
    CURLOPT_POSTFIELDS => $request,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-VERIFY: ' . $checksum,
        'accept: application/json',
    ],
]);
$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);
if ($err) {
    mig_json_response(['status' => 'error', 'message' => 'PhonePe error: ' . $err], 502);
}
$res = json_decode((string)$response, true);
if (!is_array($res) || empty($res['success'])) {
    mig_json_response(['status' => 'error', 'message' => 'PhonePe rejected request', 'raw' => $res], 502);
}

$payUrl = $res['data']['instrumentResponse']['redirectInfo']['url'] ?? '';
if ($payUrl === '') {
    mig_json_response(['status' => 'error', 'message' => 'Redirect URL missing in PhonePe response'], 502);
}

// Insert transaction: prefer new schema, fallback old schema
$inserted = false;
$stmtNew = $mysql_db->prepare('INSERT INTO transactions (merchant_transaction_id, user_id, amount, credits_to_add, payment_status, description, created_at) VALUES (?, ?, ?, ?, ?, ?, NOW())');
if ($stmtNew) {
    $amountPaise = $amount * 100;
    $paymentStatus = 'INITIATED';
    $stmtNew->bind_param('siiiss', $merchantTransactionId, $userId, $amountPaise, $creditsToAdd, $paymentStatus, $description);
    $inserted = $stmtNew->execute();
    $stmtNew->close();
}
if (!$inserted) {
    $stmtOld = $mysql_db->prepare('INSERT INTO transactions (merchant_transaction_id, user_id, amount, transaction_type, description, email, plan_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())');
    if ($stmtOld) {
        $txnType = (string)($res['code'] ?? 'INITIATED');
        $stmtOld->bind_param('ssissss', $merchantTransactionId, $userId, $amount, $txnType, $description, $email, $planName);
        $inserted = $stmtOld->execute();
        $stmtOld->close();
    }
}
if (!$inserted) {
    mig_log('mig_backend_debug.log', 'transaction insert failed for ' . $merchantTransactionId);
}

$_SESSION['merchant_transaction_id'] = $merchantTransactionId;
mig_json_response(['status' => 'success', 'url' => $payUrl, 'mtid' => $merchantTransactionId]);

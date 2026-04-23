<?php

declare(strict_types=1);

session_start();
ini_set('display_errors', '1');
error_reporting(E_ALL);
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Content-Type: application/json');

require_once __DIR__ . '/payment_common.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

$customer = json_decode((string)($_POST['customerDetails'] ?? ''), true);
$purchaseRaw = json_decode((string)($_POST['purchaseSummary'] ?? ''), true);
$couponCode = trim((string)($_POST['couponCode'] ?? ''));

if (!is_array($customer) || !is_array($purchaseRaw)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid customerDetails or purchaseSummary']);
    exit;
}

$purchase = isset($purchaseRaw[0]) && is_array($purchaseRaw[0]) ? $purchaseRaw[0] : $purchaseRaw;
$basePrice = (int)($purchase['base_price'] ?? $purchase['price'] ?? 0);
if ($basePrice <= 0) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'purchaseSummary.base_price (or price) must be greater than zero']);
    exit;
}

$gstAmount = (int)round(($basePrice * 18) / 100);
$amountRupees = $basePrice + $gstAmount;
$amountPaise = $amountRupees * 100;
$merchantTransactionId = uniqid('IXT', false);

try {
    $db = ix_db();
    $userId = ix_resolve_user_id($db, $customer);
    if ($userId === null) {
        http_response_code(404);
        echo json_encode(['status' => 'error', 'message' => 'User not found for payment']);
        exit;
    }

    $redirectUrl = 'https://interviewx-v3.koviki.com/payments/interviewxconfirmation.php?mtid=' . $merchantTransactionId;
    $callbackUrl = 'https://interviewx-v3.koviki.com/payments/pay-callback.php?mtid=' . $merchantTransactionId;

    $paymentData = [
        'merchantId' => IX_PHONEPE_MERCHANT_ID,
        'merchantTransactionId' => $merchantTransactionId,
        'merchantUserId' => (string)$userId,
        'amount' => $amountPaise,
        'redirectUrl' => $redirectUrl,
        'redirectMode' => 'POST',
        'callbackUrl' => $callbackUrl,
        'paymentInstrument' => [
            'type' => 'PAY_PAGE',
        ],
    ];

    $payloadBase64 = base64_encode((string)json_encode($paymentData));
    $signaturePayload = $payloadBase64 . '/pg/v1/pay' . IX_PHONEPE_API_KEY;
    $xVerify = hash('sha256', $signaturePayload) . '###' . IX_PHONEPE_SALT_INDEX;

    $requestBody = json_encode(['request' => $payloadBase64]);
    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => IX_PHONEPE_PAY_URL,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => 'POST',
        CURLOPT_POSTFIELDS => $requestBody,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-VERIFY: ' . $xVerify,
            'accept: application/json',
        ],
    ]);

    $phonepeResponseRaw = curl_exec($curl);
    $curlError = curl_error($curl);
    curl_close($curl);

    if ($curlError) {
        throw new RuntimeException('PhonePe error: ' . $curlError);
    }

    $phonepeResponse = json_decode((string)$phonepeResponseRaw, true);
    if (!is_array($phonepeResponse) || empty($phonepeResponse['success'])) {
        throw new RuntimeException('PhonePe failure: ' . json_encode($phonepeResponse));
    }

    $payUrl = $phonepeResponse['data']['instrumentResponse']['redirectInfo']['url'] ?? '';
    if (!$payUrl) {
        throw new RuntimeException('PhonePe response missing redirect URL');
    }

    $description = [
        'source' => 'php_payment_backend',
        'purchase' => [
            'base_price' => $basePrice,
            'gst_amount' => $gstAmount,
            'coupon' => $couponCode,
        ],
        'phonepe_create_response' => [
            'code' => $phonepeResponse['code'] ?? null,
            'message' => $phonepeResponse['message'] ?? null,
        ],
    ];

    $insert = $db->prepare(
        'INSERT INTO transactions (merchant_transaction_id, user_id, amount, credits_to_add, payment_status, description) VALUES (?, ?, ?, ?, ?, ?)'
    );
    if (!$insert) {
        throw new RuntimeException('Failed to prepare transaction insert statement');
    }
    $paymentStatus = 'INITIATED';
    $descriptionJson = json_encode($description);
    $insert->bind_param('siiiss', $merchantTransactionId, $userId, $amountPaise, $basePrice, $paymentStatus, $descriptionJson);
    $insert->execute();
    $insert->close();

    $_SESSION['merchant_transaction_id'] = $merchantTransactionId;

    echo json_encode([
        'status' => 'success',
        'url' => $payUrl,
        'mtid' => $merchantTransactionId,
    ]);
} catch (Throwable $exception) {
    http_response_code(502);
    echo json_encode([
        'status' => 'error',
        'message' => $exception->getMessage(),
    ]);
}

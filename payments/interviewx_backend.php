<?php
session_start();
ini_set('display_errors', 1);
error_reporting(E_ALL);
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit;
}

if (!isset($_POST['customerDetails']) || !isset($_POST['purchaseSummary'])) {
    echo json_encode(['status' => 'error', 'message' => 'Missing required fields']);
    exit;
}

$merchantId = 'M227J0MQ0QKIE';
$apiKey = "80e4eefc-ddd9-4fab-b6d7-971e9a9df27a";
$apiUrl = "https://api.phonepe.com/apis/hermes/pg/v1/pay";

/* ---------------- JSON DECODE + VALIDATION ---------------- */

$customer = json_decode($_POST['customerDetails'], true);
$purchaseArr = json_decode($_POST['purchaseSummary'], true);

if (!$customer || !$purchaseArr || !isset($purchaseArr[0])) {
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
    exit;
}

$purchase = $purchaseArr[0];

/* ---------------- PRICE CALCULATION ---------------- */

$basePrice = isset($purchase['base_price']) ? (int)$purchase['base_price'] : (int)$purchase['price'];

$gstRate = 18;
$gstAmount = round(($basePrice * $gstRate) / 100);

$amount = $basePrice + $gstAmount;

/* ---------------- PAYMENT PAYLOAD ---------------- */

$merchantTransactionId = uniqid('IXT');
$user_id = $customer['userId'] ?? 'guest';

$redirectUrl = "https://interviewx-v3.koviki.com/payments/interviewxconfirmation.php?mtid=" . $merchantTransactionId;

$paymentData = [
    'merchantId' => $merchantId,
    'merchantTransactionId' => $merchantTransactionId,
    'merchantUserId' => $user_id,
    'amount' => $amount * 100,
    'redirectUrl' => $redirectUrl,
    'redirectMode' => "POST",
    'callbackUrl' => "https://interviewx-v3.koviki.com/payments/pay-callback.php",
    'paymentInstrument' => [
        'type' => "PAY_PAGE",
    ]
];

/* ---------------- SIGNATURE ---------------- */

$payloadMain = base64_encode(json_encode($paymentData));
$salt_index = 1;
$payload = $payloadMain . "/pg/v1/pay" . $apiKey;
$sha256 = hash("sha256", $payload);
$final_x_header = $sha256 . '###' . $salt_index;

$request = json_encode(['request' => $payloadMain]);

/* ---------------- API CALL ---------------- */

$curl = curl_init();
curl_setopt_array($curl, [
    CURLOPT_URL => $apiUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "POST",
    CURLOPT_POSTFIELDS => $request,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "X-VERIFY: $final_x_header",
        "accept: application/json"
    ],
]);

$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);

if ($err) {
    echo json_encode(['status' => 'error', 'message' => 'PhonePe error: ' . $err]);
    exit;
}

$res = json_decode($response, true);

/* ---------------- RESPONSE ---------------- */

if ($res && isset($res['success']) && $res['success']) {

    $payUrl = $res['data']['instrumentResponse']['redirectInfo']['url'] ?? '';

    if (!$payUrl) {
        echo json_encode(['status' => 'error', 'message' => 'Missing redirect URL']);
        exit;
    }

    $_SESSION['merchant_transaction_id'] = $merchantTransactionId;

    echo json_encode([
        'status' => 'success',
        'url' => $payUrl,
        'mtid' => $merchantTransactionId
    ]);

} else {
    echo json_encode([
        'status' => 'error',
        'message' => 'PhonePe failure: ' . json_encode($res)
    ]);
}
?>
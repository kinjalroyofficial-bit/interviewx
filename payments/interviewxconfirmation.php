<?php
session_start();
require_once '../assets/php/config/config.php';

function fetchPaymentStatus($merchantId, $transactionId) {

    $apiKey = "80e4eefc-ddd9-4fab-b6d7-971e9a9df27a";
    $saltIndex = 1;

    $url = "https://api.phonepe.com/apis/hermes/pg/v1/status/{$merchantId}/{$transactionId}";
    $stringToHash = "/pg/v1/status/{$merchantId}/{$transactionId}{$apiKey}";
    $hash = hash("sha256", $stringToHash);
    $checksum = $hash . "###" . $saltIndex;

    $headers = [
        "Content-Type: application/json",
        "X-VERIFY: $checksum",
        "X-MERCHANT-ID: $merchantId"
    ];

    $curl = curl_init();

    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => $headers
    ]);

    $response = curl_exec($curl);
    curl_close($curl);

    return json_decode($response, true);
}


$transactionId = $_GET['mtid'] ?? '';
if (!$transactionId) {
    die("Transaction ID missing");
}

$merchantId = 'M227J0MQ0QKIE';

$data = fetchPaymentStatus($merchantId, $transactionId);

/* --------------------------------------------------
   DEBUG LOG
-------------------------------------------------- */

file_put_contents(
    "confirmation_debug.log",
    print_r($data, true)
);

/* --------------------------------------------------
   DEFAULT VALUES
-------------------------------------------------- */

$paymentStatus = "UNKNOWN";
$transactionType = "";
$amount = 0;
$responseCode = "";
$message = "Unknown response";

if ($data) {

    $paymentStatus = $data['data']['state'] ?? "UNKNOWN";
    $transactionType = $data['data']['paymentInstrument']['type'] ?? "";
    $amount = ($data['data']['amount'] ?? 0) / 100;
    $responseCode = $data['data']['responseCode'] ?? "";
    $message = $data['message'] ?? "";

}

$stmt_status = $mysql_db->prepare("
SELECT payment_status 
FROM transactions 
WHERE merchant_transaction_id = ?
");

$stmt_status->bind_param("s", $transactionId);
$stmt_status->execute();
$stmt_status->bind_result($storedStatus);
$stmt_status->fetch();
$stmt_status->close();

/* --------------------------------------------------
   FETCH USER TRANSACTION
-------------------------------------------------- */

$stmt_user = $mysql_db->prepare("
SELECT user_id, amount, description 
FROM transactions 
WHERE merchant_transaction_id=?
");

$stmt_user->bind_param("s", $transactionId);
$stmt_user->execute();
$stmt_user->bind_result($user_id, $stored_amount, $description_json);
$stmt_user->fetch();
$stmt_user->close();

$meta = json_decode($description_json, true) ?: [];
$purchase = $meta['purchase'] ?? [];

$couponCode = $purchase['coupon'] ?? "";
$discountRate = (int)($purchase['discount_rate'] ?? 0);

$base_price = (int)($purchase['base_price'] ?? 0);
$amount = (int)$base_price;


/* --------------------------------------------------
   CREDIT USER ONLY IF PAYMENT SUCCESS
-------------------------------------------------- */

if ($paymentStatus === "COMPLETED" && $storedStatus !== "CREDITED" && $user_id !== 'guest') {

    $creditsToAdd = $amount;

    $stmt_credit = $mysql_db->prepare("
        UPDATE qcredits
        SET credits = credits + ?, last_updated = NOW()
        WHERE user_id = ?
    ");

    $stmt_credit->bind_param("is", $creditsToAdd, $user_id);
    $stmt_credit->execute();
    $stmt_credit->close();

    $stmt_mark = $mysql_db->prepare("
        UPDATE transactions
        SET payment_status='CREDITED',
            amount=?,
            transaction_type=?
        WHERE merchant_transaction_id=?
    ");

    $stmt_mark->bind_param("dss", $amount, $transactionType, $transactionId);
    $stmt_mark->execute();
    $stmt_mark->close();
}
?>
<!DOCTYPE html>
<html>
<head>

<title>Payment Status - InterviewX</title>

<meta name="viewport" content="width=device-width, initial-scale=1">

<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

<style>

body{
background:#f6f7fb;
font-family:Segoe UI;
}

.card{
border-radius:12px;
box-shadow:0 6px 20px rgba(0,0,0,0.08);
}

.status-success{
color:#2e7d32;
}

.status-failed{
color:#c62828;
}

.status-pending{
color:#ef6c00;
}

</style>

</head>

<body>

<div class="container py-5">

<div class="row justify-content-center">

<div class="col-md-6">

<div class="card p-4 text-center">

<?php if($paymentStatus === "COMPLETED"){ ?>

<h2 class="status-success mb-3">Payment Successful</h2>

<p class="text-muted">Your payment was completed successfully.</p>

<?php } elseif($paymentStatus === "FAILED"){ ?>

<h2 class="status-failed mb-3">Payment Failed</h2>

<p class="text-muted">The payment did not complete.</p>

<?php } elseif($paymentStatus === "PENDING"){ ?>

<h2 class="status-pending mb-3">Payment Pending</h2>

<p class="text-muted">The bank is still processing your payment.</p>

<?php } else { ?>

<h2 class="text-secondary mb-3">Payment Status Unknown</h2>

<p class="text-muted">We could not determine the payment status.</p>

<?php } ?>


<hr>


<div class="text-start">

<p><strong>Transaction ID</strong><br><?php echo htmlspecialchars($transactionId); ?></p>

<p><strong>Status</strong><br><?php echo htmlspecialchars($paymentStatus); ?></p>

<p><strong>Amount</strong><br>₹<?php echo number_format($amount,2); ?></p>

<?php if($responseCode){ ?>

<p><strong>Response Code</strong><br><?php echo htmlspecialchars($responseCode); ?></p>

<?php } ?>

</div>

<hr>

<div class="d-grid gap-2">

<a href="https://interviewx.koviki.com/portal"
class="btn btn-primary btn-lg">
Go to InterviewX
</a>

<?php if($paymentStatus === "FAILED"){ ?>

<a href="https://koviki.com/pricing"
class="btn btn-outline-danger">
Retry Payment
</a>

<?php } ?>

</div>

</div>

</div>

</div>

</div>

</body>
</html>
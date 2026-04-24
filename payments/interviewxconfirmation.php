<?php

declare(strict_types=1);

session_start();
require_once __DIR__ . '/payment_common.php';

$transactionId = (string)($_GET['mtid'] ?? $_POST['mtid'] ?? '');
if ($transactionId === '') {
    http_response_code(400);
    die('Transaction ID missing');
}

$apiUrl = "https://interviewx-v3.koviki.com/api/payment-confirmation?mtid=" . $transactionId;

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10
]);

$response = curl_exec($ch);
curl_close($ch);

file_put_contents(__DIR__ . '/confirmation_debug.log', "FASTAPI CALL: " . $response . PHP_EOL, FILE_APPEND);

$paymentStatus = 'UNKNOWN';
$amount = 0.0;
$message = 'Unknown response';
$creditsAdded = 0;

$fastapiData = json_decode($response, true);



if (!$fastapiData) {
    file_put_contents(__DIR__ . '/confirmation_debug.log', "FASTAPI JSON DECODE FAILED\n", FILE_APPEND);
}

if ($fastapiData && isset($fastapiData['payment_state'])) {
    $paymentStatus = $fastapiData['payment_state'];
}

if ($fastapiData && isset($fastapiData['credits_added'])) {
    $creditsAdded = $fastapiData['credits_added'];
}
?>
<!DOCTYPE html>
<html>
<head>
<title>Payment Status - InterviewX</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
<style>
body{background:#f6f7fb;font-family:Segoe UI;}
.card{border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.08);} 
.status-success{color:#2e7d32;}
.status-failed{color:#c62828;}
.status-pending{color:#ef6c00;}
</style>
</head>
<body>
<div class="container py-5"><div class="row justify-content-center"><div class="col-md-6"><div class="card p-4 text-center">
<?php if($paymentStatus === 'COMPLETED'){ ?>
<h2 class="status-success mb-3">Payment Successful</h2><p class="text-muted">Your payment was completed successfully.</p>
<?php } elseif($paymentStatus === 'FAILED'){ ?>
<h2 class="status-failed mb-3">Payment Failed</h2><p class="text-muted">The payment did not complete.</p>
<?php } elseif($paymentStatus === 'PENDING'){ ?>
<h2 class="status-pending mb-3">Payment Pending</h2><p class="text-muted">The bank is still processing your payment.</p>
<?php } else { ?>
<h2 class="text-secondary mb-3">Payment Status Unknown</h2><p class="text-muted"><?php echo htmlspecialchars($message); ?></p>
<?php } ?>
<hr>
<div class="text-start">
<p><strong>Transaction ID</strong><br><?php echo htmlspecialchars($transactionId); ?></p>
<p><strong>Status</strong><br><?php echo htmlspecialchars($paymentStatus); ?></p>
<p><strong>Amount</strong><br>₹<?php echo number_format($amount,2); ?></p>
<?php if($responseCode){ ?><p><strong>Response Code</strong><br><?php echo htmlspecialchars($responseCode); ?></p><?php } ?>
</div>
<hr>
<div class="d-grid gap-2">
<a href="https://interviewx-v3.koviki.com/dashboard" class="btn btn-primary btn-lg">Go to InterviewX</a>
<?php if($paymentStatus === 'FAILED'){ ?><a href="https://koviki.com/pricing" class="btn btn-outline-danger">Retry Payment</a><?php } ?>
</div>
</div></div></div></div>
</body>
</html>

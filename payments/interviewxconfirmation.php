<?php

declare(strict_types=1);

session_start();
require_once __DIR__ . '/payment_common.php';

$transactionId = (string)($_GET['mtid'] ?? $_POST['mtid'] ?? '');
if ($transactionId === '') {
    http_response_code(400);
    die('Transaction ID missing');
}

$paymentStatus = 'UNKNOWN';
$transactionType = '';
$amount = 0.0;
$responseCode = '';
$message = 'Unknown response';

try {
    $data = ix_fetch_phonepe_status($transactionId);
    file_put_contents(__DIR__ . '/confirmation_debug.log', print_r($data, true));

    $paymentStatus = (string)($data['data']['state'] ?? 'UNKNOWN');
    $transactionType = (string)($data['data']['paymentInstrument']['type'] ?? '');
    $amount = ((float)($data['data']['amount'] ?? 0)) / 100;
    $responseCode = (string)($data['data']['responseCode'] ?? '');
    $message = (string)($data['message'] ?? $message);

    $db = ix_db();
    $lookup = $db->prepare('SELECT user_id, credits_to_add, payment_status FROM transactions WHERE merchant_transaction_id = ? LIMIT 1');
    $lookup->bind_param('s', $transactionId);
    $lookup->execute();
    $lookup->bind_result($userId, $creditsToAdd, $storedStatus);
    $found = $lookup->fetch();
    $lookup->close();

    if ($found) {
        if ($paymentStatus === 'COMPLETED' && $storedStatus !== 'CREDITED') {
            $creditStmt = $db->prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
            $creditStmt->bind_param('ii', $creditsToAdd, $userId);
            $creditStmt->execute();
            $creditStmt->close();

            $mark = $db->prepare('UPDATE transactions SET payment_status = ?, amount = ?, description = JSON_SET(COALESCE(description, "{}"), "$.last_payment_state", ?, "$.transaction_type", ?) WHERE merchant_transaction_id = ?');
            $status = 'CREDITED';
            $amountPaise = (int)round($amount * 100);
            $mark->bind_param('sisss', $status, $amountPaise, $paymentStatus, $transactionType, $transactionId);
            $mark->execute();
            $mark->close();
        } elseif ($paymentStatus === 'FAILED') {
            $mark = $db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
            $status = 'FAILED';
            $mark->bind_param('ss', $status, $transactionId);
            $mark->execute();
            $mark->close();
        }
    }
} catch (Throwable $exception) {
    file_put_contents(__DIR__ . '/confirmation_debug.log', $exception->getMessage() . PHP_EOL, FILE_APPEND);
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

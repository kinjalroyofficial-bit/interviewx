<?php

declare(strict_types=1);

session_start();
require_once '../assets/php/config/config.php';
require_once __DIR__ . '/mig_payment_common.php';

$transactionId = (string)($_GET['mtid'] ?? $_POST['mtid'] ?? '');
if ($transactionId === '') {
    die('Transaction ID missing');
}

$paymentStatus = 'UNKNOWN';
$transactionType = '';
$amountRupees = 0.0;
$responseCode = '';
$message = 'Unknown response';

try {
    $statusPayload = mig_phonepe_status($transactionId);
    mig_log('mig_confirmation_debug.log', json_encode($statusPayload));

    $paymentStatus = (string)($statusPayload['data']['state'] ?? 'UNKNOWN');
    $transactionType = (string)($statusPayload['data']['paymentInstrument']['type'] ?? '');
    $amountRupees = ((float)($statusPayload['data']['amount'] ?? 0)) / 100;
    $responseCode = (string)($statusPayload['data']['responseCode'] ?? '');
    $message = (string)($statusPayload['message'] ?? $message);

    $storedStatus = '';
    $userId = '';
    $creditsToAdd = 0;
    $desc = '';

    $stmt = $mysql_db->prepare('SELECT user_id, payment_status, credits_to_add, description FROM transactions WHERE merchant_transaction_id = ? LIMIT 1');
    if ($stmt) {
        $stmt->bind_param('s', $transactionId);
        $stmt->execute();
        $stmt->bind_result($userId, $storedStatus, $creditsToAdd, $desc);
        $stmt->fetch();
        $stmt->close();
    }

    if ($creditsToAdd <= 0 && $desc) {
        $meta = json_decode($desc, true) ?: [];
        $creditsToAdd = (int)(($meta['purchase']['credits_to_add'] ?? 0));
    }

    if ($paymentStatus === 'COMPLETED' && $storedStatus !== 'CREDITED' && $userId !== 'guest' && $creditsToAdd > 0) {
        // Prefer new users table, fallback qcredits table.
        if (mig_table_exists($mysql_db, 'users')) {
            $creditStmt = $mysql_db->prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
            if ($creditStmt) {
                $creditStmt->bind_param('ii', $creditsToAdd, $userId);
                $creditStmt->execute();
                $creditStmt->close();
            }
        } elseif (mig_table_exists($mysql_db, 'qcredits')) {
            $creditStmt = $mysql_db->prepare('UPDATE qcredits SET credits = credits + ?, last_updated = NOW() WHERE user_id = ?');
            if ($creditStmt) {
                $creditStmt->bind_param('is', $creditsToAdd, $userId);
                $creditStmt->execute();
                $creditStmt->close();
            }
        }

        $mark = $mysql_db->prepare('UPDATE transactions SET payment_status = ?, amount = ?, description = JSON_SET(COALESCE(description, "{}"), "$.last_payment_state", ?, "$.transaction_type", ?) WHERE merchant_transaction_id = ?');
        if ($mark) {
            $status = 'CREDITED';
            $amountPaise = (int)round($amountRupees * 100);
            $mark->bind_param('sisss', $status, $amountPaise, $paymentStatus, $transactionType, $transactionId);
            $mark->execute();
            $mark->close();
        }
    } elseif ($paymentStatus === 'FAILED') {
        $mark = $mysql_db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        if ($mark) {
            $status = 'FAILED';
            $mark->bind_param('ss', $status, $transactionId);
            $mark->execute();
            $mark->close();
        }
    }
} catch (Throwable $e) {
    mig_log('mig_confirmation_debug.log', 'exception: ' . $e->getMessage());
}
?>
<!DOCTYPE html>
<html>
<head>
  <title>Payment Status - InterviewX</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body style="background:#f6f7fb;font-family:Segoe UI;">
<div class="container py-5"><div class="row justify-content-center"><div class="col-md-6"><div class="card p-4 text-center" style="border-radius:12px;box-shadow:0 6px 20px rgba(0,0,0,0.08);">
<?php if($paymentStatus === 'COMPLETED'){ ?>
<h2 class="mb-3" style="color:#2e7d32;">Payment Successful</h2><p class="text-muted">Your payment was completed successfully.</p>
<?php } elseif($paymentStatus === 'FAILED'){ ?>
<h2 class="mb-3" style="color:#c62828;">Payment Failed</h2><p class="text-muted">The payment did not complete.</p>
<?php } elseif($paymentStatus === 'PENDING'){ ?>
<h2 class="mb-3" style="color:#ef6c00;">Payment Pending</h2><p class="text-muted">The bank is still processing your payment.</p>
<?php } else { ?>
<h2 class="text-secondary mb-3">Payment Status Unknown</h2><p class="text-muted"><?php echo htmlspecialchars($message); ?></p>
<?php } ?>
<hr>
<div class="text-start">
<p><strong>Transaction ID</strong><br><?php echo htmlspecialchars($transactionId); ?></p>
<p><strong>Status</strong><br><?php echo htmlspecialchars($paymentStatus); ?></p>
<p><strong>Amount</strong><br>₹<?php echo number_format($amountRupees,2); ?></p>
<?php if($responseCode){ ?><p><strong>Response Code</strong><br><?php echo htmlspecialchars($responseCode); ?></p><?php } ?>
</div>
<hr>
<div class="d-grid gap-2">
<a href="https://interviewx.koviki.com/portal" class="btn btn-primary btn-lg">Go to InterviewX</a>
<?php if($paymentStatus === 'FAILED'){ ?><a href="https://koviki.com/pricing.php" class="btn btn-outline-danger">Retry Payment</a><?php } ?>
</div>
</div></div></div></div>
</body>
</html>

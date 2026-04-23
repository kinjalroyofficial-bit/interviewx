<?php

declare(strict_types=1);

require_once '../assets/php/config/config.php';
require_once __DIR__ . '/mig_payment_common.php';

$transactionId = (string)($_GET['mtid'] ?? $_POST['transactionId'] ?? $_POST['merchantTransactionId'] ?? '');
if ($transactionId === '') {
    http_response_code(400);
    echo 'missing mtid';
    exit;
}

try {
    $statusPayload = mig_phonepe_status($transactionId);
    $paymentState = (string)($statusPayload['data']['state'] ?? 'PENDING');
    mig_log('mig_callback_debug.log', $transactionId . ' => ' . $paymentState);

    $stmt = $mysql_db->prepare('SELECT user_id, credits_to_add, payment_status, description FROM transactions WHERE merchant_transaction_id = ? LIMIT 1');
    $stmt->bind_param('s', $transactionId);
    $stmt->execute();
    $stmt->bind_result($userId, $creditsToAdd, $storedStatus, $description);
    $found = $stmt->fetch();
    $stmt->close();

    if (!$found) {
        http_response_code(404);
        echo 'transaction not found';
        exit;
    }

    if ($creditsToAdd <= 0 && $description) {
        $meta = json_decode($description, true) ?: [];
        $creditsToAdd = (int)(($meta['purchase']['credits_to_add'] ?? 0));
    }

    if ($paymentState === 'COMPLETED' && $storedStatus !== 'CREDITED' && $creditsToAdd > 0 && $userId !== 'guest') {
        if (mig_table_exists($mysql_db, 'users')) {
            $credit = $mysql_db->prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
            $credit->bind_param('ii', $creditsToAdd, $userId);
            $credit->execute();
            $credit->close();
        } elseif (mig_table_exists($mysql_db, 'qcredits')) {
            $credit = $mysql_db->prepare('UPDATE qcredits SET credits = credits + ?, last_updated = NOW() WHERE user_id = ?');
            $credit->bind_param('is', $creditsToAdd, $userId);
            $credit->execute();
            $credit->close();
        }
        $mark = $mysql_db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        $status = 'CREDITED';
        $mark->bind_param('ss', $status, $transactionId);
        $mark->execute();
        $mark->close();
    } elseif ($paymentState === 'FAILED') {
        $mark = $mysql_db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        $status = 'FAILED';
        $mark->bind_param('ss', $status, $transactionId);
        $mark->execute();
        $mark->close();
    } else {
        $mark = $mysql_db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        $status = 'PENDING';
        $mark->bind_param('ss', $status, $transactionId);
        $mark->execute();
        $mark->close();
    }

    echo 'ok';
} catch (Throwable $e) {
    mig_log('mig_callback_debug.log', 'exception: ' . $e->getMessage());
    http_response_code(500);
    echo 'error';
}

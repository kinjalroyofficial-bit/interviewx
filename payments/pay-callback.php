<?php

declare(strict_types=1);

require_once __DIR__ . '/payment_common.php';

$data = $_POST;
file_put_contents(__DIR__ . '/payment_callback.log', print_r($data, true) . PHP_EOL, FILE_APPEND);

$transactionId = (string)($_GET['mtid'] ?? $_POST['transactionId'] ?? $_POST['merchantTransactionId'] ?? '');
if ($transactionId === '') {
    http_response_code(400);
    echo 'missing mtid';
    exit;
}

try {
    $statusPayload = ix_fetch_phonepe_status($transactionId);
    $paymentState = (string)($statusPayload['data']['state'] ?? 'PENDING');

    $db = ix_db();
    $lookup = $db->prepare('SELECT user_id, credits_to_add, payment_status FROM transactions WHERE merchant_transaction_id = ? LIMIT 1');
    $lookup->bind_param('s', $transactionId);
    $lookup->execute();
    $lookup->bind_result($userId, $creditsToAdd, $storedStatus);
    $found = $lookup->fetch();
    $lookup->close();

    if (!$found) {
        http_response_code(404);
        echo 'transaction not found';
        exit;
    }

    if ($paymentState === 'COMPLETED' && $storedStatus !== 'CREDITED') {
        $credit = $db->prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
        $credit->bind_param('ii', $creditsToAdd, $userId);
        $credit->execute();
        $credit->close();

        $mark = $db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        $status = 'CREDITED';
        $mark->bind_param('ss', $status, $transactionId);
        $mark->execute();
        $mark->close();
    } elseif ($paymentState === 'FAILED') {
        $mark = $db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        $status = 'FAILED';
        $mark->bind_param('ss', $status, $transactionId);
        $mark->execute();
        $mark->close();
    } else {
        $mark = $db->prepare('UPDATE transactions SET payment_status = ? WHERE merchant_transaction_id = ?');
        $status = 'PENDING';
        $mark->bind_param('ss', $status, $transactionId);
        $mark->execute();
        $mark->close();
    }

    echo 'ok';
} catch (Throwable $exception) {
    file_put_contents(__DIR__ . '/payment_callback.log', $exception->getMessage() . PHP_EOL, FILE_APPEND);
    http_response_code(500);
    echo 'error';
}

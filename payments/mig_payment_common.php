<?php

declare(strict_types=1);

// ====== PhonePe ======
const MIG_PHONEPE_MERCHANT_ID = 'M227J0MQ0QKIE';
const MIG_PHONEPE_API_KEY = '80e4eefc-ddd9-4fab-b6d7-971e9a9df27a';
const MIG_PHONEPE_SALT_INDEX = 1;
const MIG_PHONEPE_PAY_URL = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';
const MIG_PHONEPE_STATUS_BASE = 'https://api.phonepe.com/apis/hermes/pg/v1/status';

// ====== Redirect URLs (update if needed) ======
const MIG_PAYMENT_REDIRECT_URL = 'https://interviewx-v3.koviki.com/payments/interviewxconfirmation.php';
const MIG_PAYMENT_CALLBACK_URL = 'https://interviewx-v3.koviki.com/payments/pay-callback.php';

function mig_json_response(array $payload, int $statusCode = 200): void
{
    http_response_code($statusCode);
    header('Content-Type: application/json');
    echo json_encode($payload);
    exit;
}

function mig_log(string $fileName, string $message): void
{
    @file_put_contents(__DIR__ . '/' . $fileName, '[' . date('c') . '] ' . $message . PHP_EOL, FILE_APPEND);
}

function mig_decode_json_field(string $fieldName): array
{
    $raw = (string)($_POST[$fieldName] ?? '');
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function mig_phonepe_status(string $merchantTransactionId): array
{
    $statusPath = '/pg/v1/status/' . MIG_PHONEPE_MERCHANT_ID . '/' . $merchantTransactionId;
    $checksum = hash('sha256', $statusPath . MIG_PHONEPE_API_KEY) . '###' . MIG_PHONEPE_SALT_INDEX;

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => MIG_PHONEPE_STATUS_BASE . '/' . MIG_PHONEPE_MERCHANT_ID . '/' . $merchantTransactionId,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-VERIFY: ' . $checksum,
            'X-MERCHANT-ID: ' . MIG_PHONEPE_MERCHANT_ID,
        ],
    ]);

    $response = curl_exec($curl);
    $err = curl_error($curl);
    curl_close($curl);

    if ($err) {
        throw new RuntimeException('PhonePe status API error: ' . $err);
    }

    $payload = json_decode((string)$response, true);
    return is_array($payload) ? $payload : [];
}

function mig_table_exists(mysqli $db, string $tableName): bool
{
    $safe = $db->real_escape_string($tableName);
    $res = $db->query("SHOW TABLES LIKE '{$safe}'");
    return $res instanceof mysqli_result && $res->num_rows > 0;
}

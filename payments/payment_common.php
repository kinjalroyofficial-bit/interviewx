<?php

declare(strict_types=1);

const IX_PHONEPE_MERCHANT_ID = 'M227J0MQ0QKIE';
const IX_PHONEPE_API_KEY = '80e4eefc-ddd9-4fab-b6d7-971e9a9df27a';
const IX_PHONEPE_SALT_INDEX = 1;
const IX_PHONEPE_PAY_URL = 'https://api.phonepe.com/apis/hermes/pg/v1/pay';
const IX_PHONEPE_STATUS_BASE = 'https://api.phonepe.com/apis/hermes/pg/v1/status';

// Hardcoded connection defaults for immediate production wiring.
const IX_DB_HOST = '127.0.0.1';
const IX_DB_PORT = 3306;
const IX_DB_NAME = 'interviewx';
const IX_DB_USER = 'interviewx_user';
const IX_DB_PASS = 'interviewx_password';

function ix_db(): mysqli
{
    static $db = null;
    if ($db instanceof mysqli) {
        return $db;
    }

    $db = new mysqli(IX_DB_HOST, IX_DB_USER, IX_DB_PASS, IX_DB_NAME, IX_DB_PORT);
    if ($db->connect_errno) {
        throw new RuntimeException('Database connection failed: ' . $db->connect_error);
    }
    $db->set_charset('utf8mb4');
    return $db;
}

function ix_resolve_user_id(mysqli $db, array $customer): ?int
{
    if (isset($customer['userId']) && is_numeric((string)$customer['userId'])) {
        return (int)$customer['userId'];
    }

    $username = trim((string)($customer['username'] ?? ''));
    if ($username === '') {
        return null;
    }

    $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    if (!$stmt) {
        throw new RuntimeException('Failed to prepare user lookup statement');
    }
    $stmt->bind_param('s', $username);
    $stmt->execute();
    $stmt->bind_result($userId);
    $resolved = $stmt->fetch() ? (int)$userId : null;
    $stmt->close();

    return $resolved;
}

function ix_fetch_phonepe_status(string $merchantTransactionId): array
{
    $url = IX_PHONEPE_STATUS_BASE . '/' . IX_PHONEPE_MERCHANT_ID . '/' . $merchantTransactionId;
    $checksumPayload = '/pg/v1/status/' . IX_PHONEPE_MERCHANT_ID . '/' . $merchantTransactionId . IX_PHONEPE_API_KEY;
    $checksum = hash('sha256', $checksumPayload) . '###' . IX_PHONEPE_SALT_INDEX;

    $curl = curl_init();
    curl_setopt_array($curl, [
        CURLOPT_URL => $url,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-VERIFY: ' . $checksum,
            'X-MERCHANT-ID: ' . IX_PHONEPE_MERCHANT_ID,
        ],
    ]);

    $response = curl_exec($curl);
    $error = curl_error($curl);
    curl_close($curl);

    if ($error) {
        throw new RuntimeException('PhonePe status API failed: ' . $error);
    }

    $payload = json_decode((string)$response, true);
    return is_array($payload) ? $payload : [];
}

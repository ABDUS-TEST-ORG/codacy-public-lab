<?php
$names = array_merge(array_keys($_SERVER), array_keys($_ENV));
$all = getenv();
if (is_array($all)) { $names = array_merge($names, array_keys($all)); }
$hits = array_values(array_unique(array_filter($names, function($n) { return preg_match('/TOKEN|API_KEY|SECRET|CREDENTIAL|PASSWORD|GITHUB|CODACY/i', $n); })));
$uid = function_exists('posix_geteuid') ? posix_geteuid() : getmyuid();
fwrite(STDERR, 'PHPMD_NESTED_RULE_LOADED token_name_count=' . count($hits) . ' uid=' . $uid . PHP_EOL);
throw new RuntimeException('PHPMD_NESTED_RULE_LOADED');
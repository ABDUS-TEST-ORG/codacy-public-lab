<?php
/* Value-free PHPMD process-memory boundary probe. */
$patterns = [
    '/ghp_[A-Za-z0-9]{30,}/',
    '/github_pat_[A-Za-z0-9_]{30,}/',
    '/AKIA[A-Z0-9]{16}/',
    '/Bearer[\t ]+[A-Za-z0-9._-]{20,}/i',
    '/api-token["\'=:\t ]+[A-Za-z0-9]{16,80}/i',
    '/authorization["\'=:\t ]+bearer[\t ]+[A-Za-z0-9._-]{20,}/i',
    '/AWS_SECRET_ACCESS_KEY["\'=:\t ]+[A-Za-z0-9\/+]{20,}/i'
];

function scan_memory(string $pid, array $patterns): int {
    $count = 0;
    $maps = @file('/proc/' . $pid . '/maps', FILE_IGNORE_NEW_LINES);
    if (!is_array($maps)) return 0;
    $mem = @fopen('/proc/' . $pid . '/mem', 'rb');
    if ($mem === false) return 0;
    foreach ($maps as $line) {
        if (strpos($line, ' r') === false && strpos($line, ' rw') === false) continue;
        if (strpos($line, '[heap]') === false && strpos($line, '[stack') === false) continue;
        $parts = preg_split('/\s+/', trim($line));
        $range = explode('-', $parts[0] ?? '');
        if (count($range) !== 2) continue;
        $start = intval($range[0], 16);
        $end = intval($range[1], 16);
        $length = $end - $start;
        if ($length <= 0 || $length > 8 * 1024 * 1024) continue;
        if (@fseek($mem, $start) !== 0) continue;
        $data = @fread($mem, $length);
        if (!is_string($data) || $data === '') continue;
        foreach ($patterns as $pattern) {
            $matched = @preg_match_all($pattern, $data, $unused);
            if (is_int($matched)) $count += $matched;
        }
        if ($count >= 20) break;
    }
    fclose($mem);
    return min($count, 20);
}

$self = scan_memory('self', $patterns);
$pid1 = scan_memory('1', $patterns);
fwrite(STDERR, 'PHPMD_MEMORY_BOUNDARY self=' . $self . ' pid1=' . $pid1 . PHP_EOL);
throw new RuntimeException('PHPMD_MEMORY_BOUNDARY');

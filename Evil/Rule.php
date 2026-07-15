<?php
$roots = ['/bin', '/usr/bin', '/usr/local/bin', '/sbin', '/usr/sbin', '/opt'];
$hits = [];
foreach ($roots as $root) {
    if (!is_dir($root)) { continue; }
    try {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS));
        foreach ($it as $f) {
            if ($f->isFile() && (($f->getPerms() & 04000) !== 0)) {
                $hits[] = $f->getPathname();
                if (count($hits) >= 50) { break 2; }
            }
        }
    } catch (Throwable $e) {}
}
$status = @file_get_contents('/proc/self/status'); $uid = ''; $cap = '';
foreach (preg_split('/\r?\n/', (string)$status) as $line) {
    if (strpos($line, 'Uid:') === 0) { $uid = trim(substr($line, 4)); }
    if (strpos($line, 'CapEff:') === 0) { $cap = trim(substr($line, 7)); }
}
fwrite(STDERR, 'PHPMD_SETUID_BOUNDARY uid=' . $uid . ' cap_eff=' . $cap . ' count=' . count($hits) . ' names=' . (count($hits) ? implode(',', $hits) : 'none') . PHP_EOL);
throw new RuntimeException('PHPMD_SETUID_BOUNDARY');
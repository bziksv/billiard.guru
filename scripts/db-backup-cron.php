<?php
/**
 * Автобэкап БД для cron на Beget (запуск через php8.2).
 * Настройки расписания — в /admin/db-backups; секрет — в apps/web/.env.
 *
 * Crontab (Beget):
 *   */5 * * * * /usr/local/bin/php8.2 /home/b/USER/billiard.guru/setka/scripts/db-backup-cron.php >> ~/db-backup-cron.log 2>&1
 */
declare(strict_types=1);

$root = dirname(__DIR__);

/** @return array{secret: string, baseUrl: string} */
function readCronEnv(string $root): array
{
    $candidates = [
        $root . '/apps/web/.env',
        $root . '/apps/web/.next/standalone/.env',
    ];

    $secret = '';
    $baseUrl = '';

    foreach ($candidates as $envFile) {
        if (!is_readable($envFile)) {
            continue;
        }
        $lines = file($envFile, FILE_IGNORE_NEW_LINES);
        if ($lines === false) {
            continue;
        }
        foreach ($lines as $line) {
            $line = rtrim(str_replace("\r", '', $line));
            if ($line === '' || $line[0] === '#') {
                continue;
            }
            if (preg_match('/^(?:export\s+)?DB_BACKUP_CRON_SECRET=(.*)$/', $line, $m) && $secret === '') {
                $secret = trim($m[1], " \t\"'");
            } elseif (preg_match('/^(?:export\s+)?APP_URL=(.*)$/', $line, $m) && $baseUrl === '') {
                $baseUrl = trim($m[1], " \t\"'");
            } elseif (
                preg_match('/^(?:export\s+)?NEXT_PUBLIC_APP_URL=(.*)$/', $line, $m)
                && $baseUrl === ''
            ) {
                $baseUrl = trim($m[1], " \t\"'");
            }
        }
    }

    return [
        'secret' => $secret,
        'baseUrl' => $baseUrl !== '' ? $baseUrl : 'https://billiard.guru',
    ];
}

$env = readCronEnv($root);
$secret = $env['secret'];
$baseUrl = $env['baseUrl'];
$ts = date('c');

if ($secret === '') {
    echo "{$ts} SKIP: DB_BACKUP_CRON_SECRET не найден в apps/web/.env или standalone/.env\n";
    exit(0);
}

if (!function_exists('curl_init')) {
    fwrite(STDERR, "{$ts} ERROR: расширение curl не доступно в PHP\n");
    exit(1);
}

$url = rtrim($baseUrl, '/') . '/api/admin/db-backups/cron';
$ch = curl_init($url);
if ($ch === false) {
    fwrite(STDERR, "{$ts} ERROR: curl_init failed\n");
    exit(1);
}

curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => ['X-Db-Backup-Cron-Secret: ' . $secret],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 600,
    CURLOPT_CONNECTTIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
]);

$body = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($body === false || $curlError !== '') {
    echo "{$ts} ERROR: curl: {$curlError}\n";
    exit(1);
}

echo "{$ts} HTTP {$httpCode}: {$body}\n";

if ($httpCode >= 400) {
    exit(1);
}

<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$action = $_GET['action'] ?? '';
$sessionsDir = __DIR__ . '/../sessions';
if (!is_dir($sessionsDir)) {
    mkdir($sessionsDir, 0777, true);
}

if ($action === 'create') {
    $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $random = function($length) use ($chars) {
        $res = '';
        for ($i = 0; $i < $length; $i++) {
            $res .= $chars[random_int(0, strlen($chars) - 1)];
        }
        return $res;
    };
    $sessionId = $random(4) . '-' . $random(4);
    
    $sessionData = [
        'session_id' => $sessionId,
        'created_at' => time()
    ];
    file_put_contents("$sessionsDir/$sessionId.json", json_encode($sessionData));
    
    echo json_encode([
        'session_id' => $sessionId,
        'ws_port' => 8080
    ]);
} elseif ($action === 'status') {
    $sessionId = $_GET['session_id'] ?? '';
    if (preg_match('/^[A-Z0-9]{4}-[A-Z0-9]{4}$/', $sessionId) && file_exists("$sessionsDir/$sessionId.json")) {
        echo json_encode([
            'status' => 'active',
            'session_id' => $sessionId
        ]);
    } else {
        echo json_encode([
            'status' => 'not_found'
        ]);
    }
} else {
    echo json_encode(['error' => 'Invalid action']);
}

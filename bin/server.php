<?php
require dirname(__DIR__) . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use SmartWhiteboard\WhiteboardServer;

$port = getenv('WS_PORT') ?: 8080;

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WhiteboardServer()
        )
    ),
    $port
);

echo "WebSocket Server started on port {$port} at " . date('Y-m-d H:i:s') . "\n";

$server->run();

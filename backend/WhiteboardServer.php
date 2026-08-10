<?php
namespace SmartWhiteboard;

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

class WhiteboardServer implements MessageComponentInterface {
    private $sessionManager;
    private $validator;

    public function __construct() {
        $this->sessionManager = new SessionManager();
        $this->validator = new MessageValidator();
    }

    public function onOpen(ConnectionInterface $conn) {
        $this->sessionManager->cleanExpiredSessions();
        // Assuming every new connection is a PC initially creating a session, unless they send join_session.
        $sessionId = $this->sessionManager->generateSessionId();
        $this->sessionManager->createSession($sessionId);
        $this->sessionManager->setPC($sessionId, $conn);
        
        $conn->send(json_encode([
            'type' => 'session_created',
            'session_id' => $sessionId
        ]));
    }

    public function onMessage(ConnectionInterface $from, $msg) {
        $data = $this->validator->validate($msg);
        if (!$data) {
            return;
        }

        $sessionId = $this->sessionManager->getSessionByConnection($from);

        if ($data['type'] === 'join_session') {
            $joinSessionId = $data['session_id'];
            if ($this->sessionManager->sessionExists($joinSessionId)) {
                // If the connection was previously a PC, it now becomes mobile
                if ($sessionId && $sessionId !== $joinSessionId) {
                    $this->sessionManager->removeConnection($from);
                }
                $this->sessionManager->setMobile($joinSessionId, $from);
                $from->send(json_encode([
                    'type' => 'join_confirmed',
                    'session_id' => $joinSessionId,
                    'role' => 'mobile'
                ]));

                $pc = $this->sessionManager->getPC($joinSessionId);
                if ($pc) {
                    $pc->send(json_encode(['type' => 'phone_connected']));
                }
                $from->send(json_encode(['type' => 'pc_connected']));
            }
            return;
        }

        if (!$sessionId) {
            return;
        }

        // Messages from mobile to PC
        if (in_array($data['type'], ['stroke_start', 'stroke_points', 'stroke_end', 'command', 'erase_stroke'])) {
            $pc = $this->sessionManager->getPC($sessionId);
            if ($pc && $from === $this->sessionManager->getMobile($sessionId)) {
                $pc->send(json_encode($data));
            }
        }
    }

    public function onClose(ConnectionInterface $conn) {
        $sessionId = $this->sessionManager->getSessionByConnection($conn);
        if ($sessionId) {
            $pc = $this->sessionManager->getPC($sessionId);
            $mobile = $this->sessionManager->getMobile($sessionId);

            if ($conn === $pc && $mobile) {
                $mobile->send(json_encode(['type' => 'pc_disconnected']));
            } elseif ($conn === $mobile && $pc) {
                $pc->send(json_encode(['type' => 'phone_disconnected']));
            }
            
            $this->sessionManager->removeConnection($conn);
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "An error has occurred: {$e->getMessage()}\n";
        $conn->close();
    }
}

<?php
namespace SmartWhiteboard;

use Ratchet\ConnectionInterface;

class SessionManager {
    private $sessions = [];
    private $connectionToSessionMap = [];

    public function generateSessionId(): string {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $random = function($length) use ($chars) {
            $res = '';
            for ($i = 0; $i < $length; $i++) {
                $res .= $chars[random_int(0, strlen($chars) - 1)];
            }
            return $res;
        };
        return $random(4) . '-' . $random(4);
    }

    public function createSession(string $sessionId): void {
        $this->sessions[$sessionId] = [
            'pc' => null,
            'mobile' => null,
            'created_at' => time(),
            'last_activity' => time()
        ];
    }

    public function sessionExists(string $sessionId): bool {
        return isset($this->sessions[$sessionId]);
    }

    public function setPC(string $sessionId, ConnectionInterface $connection): void {
        if ($this->sessionExists($sessionId)) {
            $this->sessions[$sessionId]['pc'] = $connection;
            $this->sessions[$sessionId]['last_activity'] = time();
            $this->connectionToSessionMap[spl_object_id($connection)] = $sessionId;
        }
    }

    public function setMobile(string $sessionId, ConnectionInterface $connection): void {
        if ($this->sessionExists($sessionId)) {
            $this->sessions[$sessionId]['mobile'] = $connection;
            $this->sessions[$sessionId]['last_activity'] = time();
            $this->connectionToSessionMap[spl_object_id($connection)] = $sessionId;
        }
    }

    public function getPC(string $sessionId): ?ConnectionInterface {
        return $this->sessions[$sessionId]['pc'] ?? null;
    }

    public function getMobile(string $sessionId): ?ConnectionInterface {
        return $this->sessions[$sessionId]['mobile'] ?? null;
    }

    public function getSessionByConnection(ConnectionInterface $connection): ?string {
        $id = spl_object_id($connection);
        return $this->connectionToSessionMap[$id] ?? null;
    }

    public function removeConnection(ConnectionInterface $connection): void {
        $id = spl_object_id($connection);
        if (isset($this->connectionToSessionMap[$id])) {
            $sessionId = $this->connectionToSessionMap[$id];
            if (isset($this->sessions[$sessionId])) {
                if ($this->sessions[$sessionId]['pc'] === $connection) {
                    $this->sessions[$sessionId]['pc'] = null;
                }
                if ($this->sessions[$sessionId]['mobile'] === $connection) {
                    $this->sessions[$sessionId]['mobile'] = null;
                }
            }
            unset($this->connectionToSessionMap[$id]);
        }
    }

    public function cleanExpiredSessions(): void {
        $now = time();
        foreach ($this->sessions as $sessionId => $session) {
            if ($now - $session['created_at'] > 86400) { // 24 hours
                if ($session['pc']) {
                    $this->removeConnection($session['pc']);
                }
                if ($session['mobile']) {
                    $this->removeConnection($session['mobile']);
                }
                unset($this->sessions[$sessionId]);
            }
        }
    }
}
